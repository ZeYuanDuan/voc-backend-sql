const db = require("../../models/mysql");
const { redisClient } = require("../../models/redis");
const Vocabulary = db.Vocabulary;
const Vocabulary_Tag = db.Vocabulary_Tag;
const Tag = db.Tag;

async function deleteVocabularies(req, res, next) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const vocabulary = await Vocabulary.findOne({ where: { id, userId } });
    if (!vocabulary) {
      return res.status(404).json({ message: `找不到單字 ID ${id}` });
    }

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

      for (const tagId of tagIds) {
        const remaining = await Vocabulary_Tag.count({ where: { tagId } });
        if (remaining === 0) {
          await Tag.destroy({ where: { id: tagId } });
        }
      }
    }

    await Vocabulary.destroy({ where: { id, userId } });

    const userVocabulariesKey = `user:${userId}:vocabularies`;
    await redisClient.del(userVocabulariesKey);

    // * 單字總量減 1
    const userVocabulariesCountKey = `user:${userId}:vocabularies:count`;
    await redisClient.decr(userVocabulariesCountKey);

    res.status(200).json({
      message: `單字 ID ${id} 刪除成功`,
    });
  } catch (error) {
    console.error("deleteVocabularies 出現錯誤：", error);
    next(error);
  }
}

module.exports = deleteVocabularies;
