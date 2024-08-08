"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Vocabulary_Tag extends Model {
    static associate(models) {
      Vocabulary_Tag.belongsTo(models.Tag, {
        foreignKey: "tagId",
        as: "tag",
      });
      Vocabulary_Tag.belongsTo(models.Vocabulary, {
        foreignKey: "vocabularyId",
        as: "vocabulary",
      });
    }
  }
  Vocabulary_Tag.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      tagId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "tags",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      vocabularyId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "vocabularies",
          key: "id",
        },
        onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: "Vocabulary_Tag",
      tableName: "Vocabulary_Tags",
      indexes: [
        {
          unique: true,
          fields: ["tagId", "vocabularyId"],
        },
      ],
    }
  );

  return Vocabulary_Tag;
};
