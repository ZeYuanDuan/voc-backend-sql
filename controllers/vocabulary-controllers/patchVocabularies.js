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

async function patchVocabularies(req, res, next) {
  const { id } = req.params;
  const userId = req.user.id;

  const { english, chinese, definition, example, tags } = req.body;

  const updateField = {
    english,
    chinese,
    definition,
    example,
    updatedAt: taipeiTime,
  };

  try {
    const vocabulary = await Vocabulary.findOne({ where: { id, userId } });
    if (!vocabulary) {
      return res.status(404).json({ message: `找不到單字 ID ${id}` });
    }

    await Vocabulary.update(filterUndefined(updateField), {
      where: { id, userId },
    });

    // * 先刪除原本該單字所屬的標籤中的單字 ID
    const oldTags = await Vocabulary_Tag.findAll({
      where: { vocabularyId: id },
    });
    if (oldTags.length > 0) {
      const tagIds = oldTags.map((tag) => tag.tagId);
      await Vocabulary_Tag.destroy({
        where: {
          tagId: tagIds,
          vocabularyId: id,
        },
      });

      // 檢查每個 tagId 是否在 Vocabulary_Tag 表中仍有對應的欄位
      for (const tagId of tagIds) {
        const tagCount = await Vocabulary_Tag.count({
          where: { tagId: tagId },
        });
        if (tagCount === 0) {
          await Tag.destroy({
            where: { id: tagId },
          });
        }
      }
    }

    // * 處理標籤
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

    res.status(200).json({
      message: `單字 ID ${id} 更新成功`,
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

module.exports = patchVocabularies;
