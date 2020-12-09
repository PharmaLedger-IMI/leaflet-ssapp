import languageServiceUtils from "./languageServiceUtils.js";
import constants from "../../constants.js";
const defaultLanguages = ["Romanian", "German"];

export default class LanguageService {
    constructor(dsuStorageInstance) {
        if (typeof dsuStorageInstance === "undefined") {
            throw Error("Provide a DSUStorage instance when creating a new Language Service");
        }

        this.DSUStorage = dsuStorageInstance;
    }

    getOrderedListOfLanguages(callback){
        this.DSUStorage.getObject(constants.LANGUAGES_STORAGE_PATH, (err, languages) => {
            if (err) {
                return callback(undefined, this.getSystemAndDefaultLanguages());
            }

            callback(undefined, languages);
        });
    }

    getSystemLanguage(){
        const browserLanguage = navigator.language;
        const browserLanguageCode = browserLanguage.substring(0, 2);
        return languageServiceUtils.getLanguageName(browserLanguageCode);
    }

    getSystemAndDefaultLanguages(){
        const systemLanguage = this.getSystemLanguage();
        const index = defaultLanguages.findIndex(lang => lang === systemLanguage);
        let languages = defaultLanguages;
        if (index >= 0) {
            languages.splice(index, 1);
        }
        languages.unshift(systemLanguage);

        return languages;
    }
};

