const db = require("../../models/mysql");
const { redisClient } = require("../../models/redis");
const Vocabulary = db.Vocabulary;
const Tag = db.Tag;
const Vocabulary_Tag = db.Vocabulary_Tag;

const moment = require("moment-timezone");
const taipeiTime = moment.tz(new Date(), "Asia/Taipei").toDate();

const SYSTEM_TAG_PREFIX = "__";
const USER_TAG_PREFIX = "user_";
const NO_TAG_NAME = `${SYSTEM_TAG_PREFIX}NoTag`;

async function postVocabularies(req, res, next) {
  const { english, chinese, definition, example, tags } = req.body;

  if (!english) {
    return res.status(400).json({ message: "未加入英文單字" });
  }

  const userId = req.user.id;
  const dataField = {
    english,
    chinese,
    definition,
    example,
    userId,
    createdAt: taipeiTime,
    updatedAt: taipeiTime,
  };

  try {
    const mysqlField = await Vocabulary.create(filterUndefined(dataField));
    const { id } = mysqlField;

    // 處理標籤
    const uniqueTags = [...new Set(tags)];
    let tagList =
      Array.isArray(uniqueTags) && uniqueTags.length > 0
        ? uniqueTags.map((tag) => USER_TAG_PREFIX + tag)
        : [NO_TAG_NAME];
    for (const tagName of tagList) {
      let tag = await Tag.findOne({
        where: { name: tagName, userId: userId },
      });
      if (!tag) {
        tag = await Tag.create({ name: tagName, userId: userId });
      }
      await Vocabulary_Tag.create({ tagId: tag.id, vocabularyId: id });
    }

    const userVocabulariesKey = `user:${userId}:vocabularies`;
    await redisClient.del(userVocabulariesKey);

    // * 單字總量加 1
    const userVocabulariesCountKey = `user:${userId}:vocabularies:count`;
    await redisClient.incr(userVocabulariesCountKey);

    res.status(200).json({
      message: "單字儲存成功",
      vocabularyId: id,
    });
  } catch (error) {
    console.error("更新資料庫出現錯誤：", error);
    next(error);
  }
}

// 輔助函數：過濾掉 undefined 的欄位
const filterUndefined = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

module.exports = postVocabularies;
