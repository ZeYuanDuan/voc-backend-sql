const db = require("../models/mysql");
const { redisClient } = require("../models/redis");
const Vocabulary = db.Vocabulary;
const axios = require("axios"); // Added axios import since it's used in the code
const moment = require("moment-timezone");

const {
  generateWordnikURL,
  generateTranslateURL,
  generateDefinitionURL,
  generateExampleURL,
} = require("../apiHelpers/wordnik");

// =========================

const homeControllers = {
  getHomePage: async (req, res, next) => {
    try {
      const { name, id } = req.user;

      const userVocabulariesCountKey = `user:${id}:vocabularies:count`;
      const vocabulariesCount = await Vocabulary.count({
        where: { userId: id },
      });
      await redisClient.set(
        userVocabulariesCountKey,
        vocabulariesCount,
        "EX",
        3600
      );
      return res.json({ name, vocStorage: vocabulariesCount });
    } catch (error) {
      next(error);
    }
  },

  getDailyVocabularies: async (req, res, next) => {
    const todayDailyKey = `daily:today`;

    try {
      const todayDailyVocabularies = await redisClient.lRange(
        todayDailyKey,
        0,
        -1
      );
      const parsedVocabularies = todayDailyVocabularies.map((vocabulary) =>
        JSON.parse(vocabulary)
      );
      res.json(parsedVocabularies);
    } catch (error) {
      res.status(500).json({ error: "獲取每日內容失敗" });
      next(error);
    }
  },

  // * 請求一串英文單字，組裝中文翻譯，存到 raw
  fetchAndStoreVocabularies: async () => {
    try {
      const rawDailyKey = `daily:raw`;
      const exists = await redisClient.exists(rawDailyKey);
      if (exists) {
        await redisClient.del(rawDailyKey);
      }

      const wordnikURL = generateWordnikURL();
      const { data } = await axios.get(wordnikURL);
      const filteredData = data.map(({ id, ...keepAttrs }) => keepAttrs);
      const wordSequence = filteredData.map((obj) => obj.word);

      const { data: translationData } = await fetchWithRetry(
        generateTranslateURL(wordSequence)
      );

      const today = moment().tz("Asia/Taipei");
      const tomorrow = moment(today).add(1, "day");

      const formattedDate = tomorrow.format("YYYY-MM-DD");

      const combinedArray = filteredData.map((obj, index) => ({
        date: formattedDate,
        data: {
          english: obj.word,
          chinese: translationData.data.translations[index].translatedText,
        },
      }));

      for (const vocab of combinedArray) {
        await redisClient.rPush(rawDailyKey, JSON.stringify(vocab));
      }
    } catch (error) {
      console.error("更新 Redis 時出現錯誤：", error);
      await redisClient.rPush(
        "errorQueue",
        JSON.stringify({
          action: "fetchAndStoreVocabularies",
          key: `daily:EngChi`,
          dataField: combinedArray,
          date: formattedDate,
          error: error.message,
        })
      );
    }
  },

  // * 將 Daily Key 的單字，加上定義和例句，存到 details
  fetchVocabulariesDetail: async () => {
    try {
      const detailDailyKey = `daily:details`;
      const exists = await redisClient.exists(detailDailyKey);
      if (exists) {
        await redisClient.del(detailDailyKey);
      }

      const rawDailyKey = `daily:raw`;
      const rawDailyVocab = await redisClient.lRange(rawDailyKey, 0, -1);
      const DailyVocab = rawDailyVocab.map((voc) => JSON.parse(voc));

      for (const { date, data } of DailyVocab) {
        const { english, chinese } = data;
        const { data: defData } = await fetchWithRetry(
          generateDefinitionURL(english)
        );
        const rawDefinition = defData.find((def) => def?.text)?.text;
        const definition = rawDefinition
          ? Array.isArray(rawDefinition)
            ? rawDefinition.join(", ").replace(/<[^>]*>/g, "")
            : rawDefinition.replace(/<[^>]*>/g, "")
          : "No definition available";

        console.log("定義：", definition); // ! 測試用

        const { data: exampleData } = await fetchWithRetry(
          generateExampleURL(english)
        );
        const example = exampleData.text
          ? Array.isArray(exampleData.text)
            ? exampleData.text.join(", ")
            : exampleData.text
          : "No example available";

        console.log("例句：", example); // ! 測試用

        const vocabularyDetail = {
          date: date,
          data: { english, chinese, definition, example },
        };

        await redisClient.rPush(
          detailDailyKey,
          JSON.stringify(vocabularyDetail)
        );
        await new Promise((resolve) => setTimeout(resolve, 20000)); // * 等 20 秒
      }
    } catch (error) {
      console.error("獲取單字詳細資訊時出現錯誤：", error);
      await redisClient.rPush(
        "errorQueue",
        JSON.stringify({
          action: "fetchVocabulariesDetail",
          key: `daily:details`,
          dataField: vocabularyDetail,
          date: date,
          error: error.message,
        })
      );
    }
  },

  updateDailyVocabularies: async () => {
    const detailDailyKey = `daily:details`;
    const todayDailyKey = `daily:today`;
    const tempKey = `daily:temp:${Date.now()}`;
    if (!(await redisClient.exists(todayDailyKey))) {
      await redisClient.lPush(todayDailyKey, '["No data available"]');
    } else if (!(await redisClient.exists(detailDailyKey))) {
      await redisClient.lPush(detailDailyKey, '["No data available"]');
    }

    try {
      await redisClient.rename(todayDailyKey, tempKey);
      await redisClient.rename(detailDailyKey, todayDailyKey);
      await redisClient.expire(tempKey, 86400);
    } catch (error) {
      console.error("Failed to update daily vocabularies:", error);
      const currentDate = moment().tz("Asia/Taipei").toISOString();
      await redisClient.rPush(
        "errorQueue",
        JSON.stringify({
          action: "updateDailyVocabularies",
          key: todayDailyKey,
          date: currentDate,
          error: error.message,
        })
      );
    }
  },
};

// * 輔助函式：請求失敗後重試
const fetchWithRetry = async (url, retries = 10) => {
  let attempts = 0;
  while (attempts < retries) {
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      if (
        error.response &&
        error.response.status === 429 &&
        attempts < retries - 1
      ) {
        const retryAfter = error.response.headers["retry-after"];
        const waitTime = (retryAfter ? parseInt(retryAfter) : 60) * 1000;
        console.log(
          `Rate limit exceeded. Retrying after ${waitTime / 1000} seconds.`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        attempts++;
      } else {
        throw error;
      }
    }
  }
};

module.exports = homeControllers;
