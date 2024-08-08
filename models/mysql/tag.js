"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Tag extends Model {
    static associate(models) {
      Tag.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
      Tag.belongsToMany(models.Vocabulary, {
        through: models.Vocabulary_Tag,
        foreignKey: "tagId",
        otherKey: "vocabularyId",
        as: "vocabularies",
      });
    }
  }
  Tag.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "標籤名稱不得為空值",
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: "Tag",
      tableName: "Tags",
    }
  );

  return Tag;
};
