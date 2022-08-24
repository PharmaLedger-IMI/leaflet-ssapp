const {WebcController} = WebCardinal.controllers;

export default class TermsAndConditionsController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model.pageContent = `<div class="label">{{$section_title}}</div>
                    <div class="content">{{ $terms_and_conditions }}</div>               `
  }
}
