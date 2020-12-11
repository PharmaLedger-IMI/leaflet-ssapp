import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import LanguageService from "../services/LanguageService/LanguageService.js";

export default class SettingsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        this.languageService = new LanguageService(this.DSUStorage);
        this.languageService.getLanguageListForOrdering((err, vm) => {
            this.model.languages = vm;

            this.model.onChange("languages", (event)=>{
                this.languageService.saveWorkingLanguages(this.model.languages.items, (err)=>{
                    if (err) {
                        throw err;
                    }
                });
            });
        });
    }
}
