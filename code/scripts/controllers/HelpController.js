const {WebcController} = WebCardinal.controllers;

export default class HelpController extends WebcController {
  constructor(...props) {
    super(...props);
    this.model.pageContent = `<div class="label">{{$section_title}}</div>
                    <div class="content">{{ $section_text }}</div>
                    <div class="label">{{$section_title1}}</div>
                    <div class="content">{{ $section_text1 }}</div>
                    <div class="label">{{$section_title2}}</div>
                    <div class="content">{{ $section_text2 }}</div>
                    <div class="label">{{$section_title3}}</div>
                    <div class="content">{{ $section_text3 }}</div>
                    <div class="label">{{$section_title4}}</div>
                    <div class="content">{{ $section_text4 }}</div>
                    <div class="label">{{$section_title5}}</div>
                    <div class="content">{{ $section_text5 }}</div>`
  }
}
