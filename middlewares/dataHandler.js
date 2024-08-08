const db = require("../models/mysql");
const { redisClient } = require("../models/redis");
const Vocabulary = db.Vocabulary;

// TODO 這個函式尚未完成，等之後再實作
async function verifyRedisDataWithMySQL(userId) {
  const userKeys = `user:${userId}:vocabularies:*`;

  try {
    const mysqlVocabularies = await Vocabulary.findAll({
      where: { userId },
      attributes: ["id"],
    });
    const mysqlVocabularyIds = mysqlVocabularies.map((vocab) =>
      vocab.id.toString()
    );

    let cursor = "0";
    const verifyTasks = [];
    do {
      const scanResult = await redisClient.scan(
        cursor,
        "MATCH",
        userKeys,
        "COUNT",
        "1000"
      );
      // console.log(scanResult); // ! 測試用
      const { cursor: newCursor, keys } = scanResult;

      cursor = newCursor.toString();

      for (const key of keys) {
        if (key.endsWith(":storage")) {
          verifyTasks.push(async () => {
            const storageValue = await redisClient.get(key);
            console.log(
              `Redis 資料庫中使用者 ${userId} 的單字存量：${storageValue}`
            ); // ! 測試用

            const mySQLStorageCount = mysqlVocabularyIds.length;
            console.log(
              `MySQL 資料庫中使用者 ${userId} 的單字存量：${mySQLStorageCount}`
            ); // ! 測試用

            if (parseInt(storageValue, 10) !== mySQLStorageCount) {
              console.log(
                `使用者 ${userId} 的單字存量 ${key} 不一致，開始同步資料...`
              );
              // TODO 同步資料流程
            }
          });
        } else if (key.match(/user:\d:vocabularies/)) {
          verifyTasks.push(async () => {
            const redisVocabularyIds = await redisClient.lRange(key, 0, -1);
            console.log(`使用者 ${userId} 的單字清單：${redisVocabularyIds}`);

            const missingInRedis = mysqlVocabularyIds.filter(
              (id) => !redisVocabularyIds.includes(id)
            );
            const extraInRedis = redisVocabularyIds.filter(
              (id) => !mysqlVocabularyIds.includes(id)
            );

            if (missingInRedis.length > 0) {
              console.log(
                `MySQL 中存在但 Redis 中缺少的詞彙 ID:`,
                missingInRedis
              );
              // TODO 同步資料流程
            }
            if (extraInRedis.length > 0) {
              console.log(
                `Redis 中存在但 MySQL 中缺少的詞彙 ID:`,
                extraInRedis
              );
              // TODO 同步資料流程
            }
            console.log(`使用者 ${userId} 的單字清單驗證完畢`);
          });
        } else if (key.match(/user:\d+:vocabularies:\d+/)) {
          verifyTasks.push(async () => {
            const vocabularyId = key.split(":").pop();
            const redisVocabulary = await redisClient.hGetAll(key);
            const mySQLvocabulary = await Vocabulary.findByPk(vocabularyId, {
              attributes: { exclude: ["userId"] },
            });

            if (!mySQLvocabulary) {
              console.log(`MySQL 中缺少單字 ID: ${vocabularyId}`);
              // TODO 同步資料流程
            }

            if (mySQLvocabulary) {
              const isConsistent = Object.entries(redisVocabulary).every(
                ([field, value]) => {
                  if (field === "createdAt" || field === "updatedAt") {
                    return (
                      mySQLvocabulary[field].toISOString() === JSON.parse(value)
                    );
                  } else if (field === "id") {
                    return mySQLvocabulary[field] === parseInt(value, 10);
                  } else {
                    return mySQLvocabulary[field] === JSON.parse(value);
                  }
                }
              );
              console.log(isConsistent); // ! 測試用
              if (!isConsistent) {
                console.log(
                  `使用者 ${userId} 的單字 ${vocabularyId} 資料不一致`
                );
              }
            }
          });
        }
      }
    } while (cursor !== "0");

    Promise.allSettled(verifyTasks.map((task) => task()))
      .then((results) => {
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            // console.log(`任務 ${index} 完成`);
          } else {
            console.error(`任務 ${index} 失敗:`, result.reason);
          }
        });
      })
      .then(() => {
        console.log("所有任務處理完畢");
      });
  } catch (error) {
    throw new Error(`驗證 Redis 資料出現錯誤：${error}`);
  }
}

async function syncVocabulariesToRedis(userId) {
  const perfStart = performance.now(); // ! 測試用
  try {
    const mySQLVocabularies = await Vocabulary.findAll({
      where: { userId },
      attributes: ["id"],
    });

    const userVocabulariesKey = `user:${userId}:vocabularies`;
    const userVocStorageKey = `user:${userId}:vocabularies:storage`;

    await redisClient.del(userVocabulariesKey);
    await redisClient.del(userVocStorageKey);

    for (const vocabulary of mySQLVocabularies) {
      await redisClient.rPush(userVocabulariesKey, vocabulary.id.toString());
    }
    const vocabulariesCount = await redisClient.lLen(userVocabulariesKey);
    await redisClient.set(userVocStorageKey, vocabulariesCount);

    console.log("MySQL 資料已同步更新到 Redis");
    const perfEnd = performance.now(); // ! 測試用
    console.log(`MySQL to Redis 耗時: ${perfEnd - perfStart} ms`); // ! 測試用
  } catch (error) {
    throw new Error(`同步資料至 Redis 出現錯誤：${error}`);
  }
}

module.exports = { verifyRedisDataWithMySQL, syncVocabulariesToRedis };
