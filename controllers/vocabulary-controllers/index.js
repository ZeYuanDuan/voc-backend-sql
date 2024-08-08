getVocabularies = require("./getVocabularies");
getSimpleVocabularies = require("./getSimpleVocabularies");
postVocabularies = require("./postVocabularies");
patchVocabularies = require("./patchVocabularies");
deleteVocabularies = require("./deleteVocabularies");

const vocabularyControllers = {
  getVocabularies,
  postVocabularies,
  patchVocabularies,
  deleteVocabularies,
  getSimpleVocabularies,
};

module.exports = vocabularyControllers;
