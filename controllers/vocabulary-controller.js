const db = require("../models");
const Vocabulary = db.Vocabulary;

const vocabularyControllers = {
  getVocabularies: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const vocabularies = await Vocabulary.findAll({
        where: {
          userId,
        },
        attributes: ["english", "chinese", "definition", "example"],
      });
      return res.status(200).json(vocabularies);
    } catch (error) {
      next(error);
    }
  },

  postVocabularies: async (req, res, next) => {
    const { english, chinese, definition, example } = req.body;
    if (!english) {
      return res.status(201).json({ message: "未加入英文單字" });
    }
    try {
      const userId = req.user.id;
      await Vocabulary.create({
        english,
        chinese,
        definition,
        example,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return res.status(201).json({ message: "單字新增成功" });
    } catch (error) {
      next(error);
    }
  },

  deleteVocabularies: async (req, res, next) => {
    const { english } = req.body;
    if (!english) {
      return res.status(201).json({ message: "未加入英文單字" });
    }
    try {
      const userId = req.user.id;
      const deleteResult = await Vocabulary.destroy({
        where: {
          userId,
          english,
        },
      });

      if (deleteResult) {
        return res.json({ message: `單字 ${english} 刪除成功` });
      } else {
        return res.status(404).json({ message: `找不到單字 ${english}` });
      }
    } catch (error) {
      next(error);
    }
  },
};

module.exports = vocabularyControllers;