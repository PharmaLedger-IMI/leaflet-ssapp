function getEmbeddedVideo(encodedVideoSource) {
  let videoSource = atob(encodedVideoSource);
  let videoUrl;

  if (videoSource.startsWith("https://www.youtube.com/")) {
    videoUrl = `https://www.youtube.com/embed/${videoSource.split("v=")[1]}?autoplay=0`
  }
  if (videoSource.startsWith("https://vimeo.com/")) {
    videoUrl = `https://player.vimeo.com/video/${videoSource.split("vimeo.com/")[1]}`
  }
  if (videoUrl) {
    return `<iframe name="url-iframe" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
            frameborder="0" src="${videoUrl}" width="310">
    </iframe>`
  }

  if (videoSource.includes("</script>")) {
    /*      let regex1 = /(?:\&width.*(?:height.*\/&))/gi
          let regex2 = /(?:\&width.*(?:height.*\"\>))/gi
          let regex3 = /(?:\width:.*height:.*px;)/gi
          if (videoSource.match(regex1)) {
            videoSource = videoSource.replace(regex1, '&width=310&height=300&');
          }
          if (videoSource.match(regex2)) {
            videoSource = videoSource.replace(regex2, '&width=310&height=300">');
          }
          if (videoSource.match(regex3)) {
            videoSource = videoSource.replace(regex3, 'width: 310px; height: 300px;');
          }*/
    return `<iframe  id="script-iframe" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
            frameborder="0" src="data:text/html;charset=utf-8,${encodeURI(videoSource)}">`
  }

  return videoSource;

}

export default {
  getEmbeddedVideo
}
