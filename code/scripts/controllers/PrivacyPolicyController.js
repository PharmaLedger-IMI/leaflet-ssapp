const {WebcController} = WebCardinal.controllers;

export default class HelpController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model.pageContent = `<div class="label">{{$section_title}}</div>
                    <div class="content">{{ $privacy_policy }}</div>               `
  }
}
