"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Vocabulary_Tags", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      tagId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "Tags",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      vocabularyId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "Vocabularies",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex(
      "Vocabulary_Tags",
      ["tagId", "vocabularyId"],
      {
        unique: true,
        fields: ["tagId", "vocabularyId"],
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Vocabulary_Tags");
  },
};
