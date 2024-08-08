const axios = require("axios");

const VOC_LIMIT = 20;

function generateWordnikURL() {
  const baseUrl = "https://api.wordnik.com/v4/words.json/randomWords";
  const params = new URLSearchParams({
    hasDictionaryDef: true,
    includePartOfSpeech:
      "noun,adjective,verb,adverb,verb-intransitive,verb-transitive,past-participle",
    minCorpusCount: 1000,
    maxCorpusCount: -1,
    minDictionaryCount: 5,
    maxDictionaryCount: -1,
    minLength: 5,
    maxLength: -1,
    api_key: process.env.WORDNIK_KEY,
    limit: VOC_LIMIT,
  });

  return `${baseUrl}?${params.toString()}`;
}

function generateTranslateURL(keywords) {
  const baseUrl = "https://translation.googleapis.com/language/translate/v2";
  const params = new URLSearchParams({
    target: "zh-TW",
    key: process.env.GOOGLE_TRANSLATION_KEY,
  });

  keywords.forEach((keyword) => params.append("q", keyword));

  return `${baseUrl}?${params.toString()}`;
}

function generateDefinitionURL(keyword) {
  const baseUrl = `https://api.wordnik.com/v4/word.json/${keyword}/definitions`;
  const params = new URLSearchParams({
    limit: 3,
    includeRelated: false,
    sourceDictionaries: "all",
    useCanonical: false,
    includeTags: false,
    api_key: process.env.WORDNIK_KEY,
  });
  return `${baseUrl}?${params.toString()}`;
}

function generateExampleURL(keyword) {
  const baseUrl = `https://api.wordnik.com/v4/word.json/${keyword}/topExample`;
  const params = new URLSearchParams({
    useCanonical: false,
    api_key: process.env.WORDNIK_KEY,
  });
  return `${baseUrl}?${params.toString()}`;
}


module.exports = {
  generateWordnikURL,
  generateTranslateURL,
  generateDefinitionURL,
  generateExampleURL,
};
