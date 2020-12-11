import constants from "../../../constants.js";
import languageServiceUtils from "./languageServiceUtils.js";

let workingLanguagesCache = [{label:"English", value: "en"}, {label:"German", value: "de"}];


function normalizeLanguage(language) {
    switch (typeof language) {
        case "string":
            if (language.length === 2) {
                return languageServiceUtils.getLanguageAsItemForVMFromCode(language);
            }
            return languageServiceUtils.getLanguageAsItemForVMFromName(language);

        case "object":
            if (typeof language.value !== "undefined") {
                return language;
            }
            if (typeof language.code !== "undefined") {
                return languageServiceUtils.getLanguageAsItemForVMFromCode(language.code);
            }

            throw Error("Invalid language format");
        default:
            throw Error(`The language should be of type string or object. Provided type ${typeof language}`);
    }
}

export default class LanguageService {
    constructor(dsuStorageInstance) {
        if (typeof dsuStorageInstance === "undefined") {
            throw Error("Provide a DSUStorage instance when creating a new Language Service");
        }

        this.DSUStorage = dsuStorageInstance;
    }

    getSystemLanguage() {
        const browserLanguage = navigator.language;
        const browserLanguageCode = browserLanguage.substring(0, 2);
        return languageServiceUtils.getLanguageAsItemForVMFromCode(browserLanguageCode);
    }

    addSystemLanguage(callback) {
        const systemLanguage = this.getSystemLanguage();
        const index = workingLanguagesCache.findIndex(lang => lang.value === systemLanguage.value);
        if (index === 0) {
            // return this.saveWorkingLanguages(workingLanguagesCache, callback);
            return callback();
        }
        if (index > 0) {
            workingLanguagesCache.splice(index, 1);
        }
        workingLanguagesCache.unshift(systemLanguage);
        this.saveWorkingLanguages(workingLanguagesCache, callback);
    }

    registerWorkingLanguages(languages, callback) {
        if (!Array.isArray(languages)) {
            languages = [languages];
        }
        let normalizedLanguages;
        try {
            normalizedLanguages = languages.filter(language => !this.hasWorkingLanguage(language))
                .map(language => normalizeLanguage(language));
        } catch (e) {
            return callback(e);
        }
        workingLanguagesCache = workingLanguagesCache.concat(normalizedLanguages);
        this.saveWorkingLanguages(workingLanguagesCache, callback);
    }

    hasWorkingLanguage(language) {
        language = normalizeLanguage(language);
        let index = workingLanguagesCache.findIndex(lang => lang.value === language.value);
        if (index >= 0) {
            return true;
        }

        return false;
    }

    getWorkingLanguages(callback) {
        this.addSystemLanguage((err) => {
            if (err) {
                return callback(err);
            }
            this.DSUStorage.getObject(constants.LANGUAGES_STORAGE_PATH, (err, languages) => {
                if (err) {
                    return callback(undefined, workingLanguagesCache);
                }

                workingLanguagesCache = languages;
                callback(undefined, languages);
            });
        });
    };

    getLanguageListForSelect(callback) {
        this.getWorkingLanguages((err, languages) => {
            languages = languages.map(language =>{
            return {label: language.value, value: language.value}
        });
            callback(undefined, languages);
        });
    }

    getLanguageListForOrdering(callback) {
        this.getWorkingLanguages((err, languages) => {
            languages[0].selected = true;
            callback(err, {items: languages})
        });
    }

    saveWorkingLanguages(languages, callback) {
        this.DSUStorage.setObject(constants.LANGUAGES_STORAGE_PATH, languages, callback);
    }
};

