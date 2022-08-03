window[new Error().stack.match(location.href.match(/(.*)\//g)+"(.*?):")[1]]=()=>{
  
  
  function isIOS(){return(/iPad|iPhone|iPod/.test(navigator.platform))?true:(navigator.maxTouchPoints&&navigator.maxTouchPoints>2&&/MacIntel/.test(navigator.platform))}
  function isIPadOS(){return navigator.maxTouchPoints&&navigator.maxTouchPoints>2&&/MacIntel/.test(navigator.platform)}


  function createButton(msg,onActivationCallback){
    // creates button that always works
    var a=document.createElement("a");
    a.__click=onActivationCallback;
    a.id="_"+crypto.randomUUID();
    a.href=("Xjavascript:document.querySelector('#"+a.id+"').__click();").replace("X","");
    a.appendChild(document.createTextNode(msg));
    return a;
  }
  
  
  function when(condition,callback,loadingMessage,finishedMessage){
    (function(){
      if(condition()){
        finishedMessage&&console.warn(finishedMessage);
        callback();
      }else{
        loadingMessage&&console.log(loadingMessage);
        requestAnimationFrame(arguments.callee);
      }
    })();  
  }


  function getDate(){
    var date  = new Date();
    return {
      month : (date.getMonth()+1).toString().padStart(2,0)  ,
      day   : date.getDate().toString().padStart(2,0)       ,
      year  : date.getFullYear().toString().padStart(4,0)   ,
    };
  }
  function getTime(){
    var date  = new Date();
    return {
      hours         : date.getHours().toString().padStart(2,0)        ,
      minutes       : date.getMinutes().toString().padStart(2,0)      ,
      seconds       : date.getSeconds().toString().padStart(2,0)      ,
      milliseconds  : date.getMilliseconds().toString().padStart(3,0) ,
    };
  }
  function getTimeStamp(){
    var date=getDate();
    var time=getTime();
    return date.month+date.day+date.year+"-"+time.hours+time.minutes+"-"+time.seconds+time.milliseconds;
  }
  
  
  

  function uploadVideo(callback){
    var input=document.createElement("input");
    input.type="file";
    input.accept="video/*"; // only allow videos to be uploaded
    input.style.position="fixed";
    input.onclick=()=>{
      input.remove();
      when(()=>input.files.length>0,()=>{
        callback(input.files[0]);
        input=null;
      });
    };
    document.documentElement.appendChild(input);
    input.click();
  }
  
  
  function downloadVideo(blob){
    blob.name = "converted-"+getTimeStamp()+((isIOS()||isIPadOS())?".mp4":".webm");
    blob.lastModified = new Date();
    var file=new File([blob],blob.name,{type:(isIOS()||isIPadOS())?"video/mp4":"video/webm",});
    if(isIOS()||isIPadOS()){
      var files=[file];
      navigator.share({files}).then(()=>{
        console.log("files shared");
      }).catch((err)=>{
        console.error("user cancelled share");
      });
    }else{
      var a       = document.createElement("a");
      a.download  = file.name;
      a.href      = URL.createObjectURL(file);
      a.target    = "_blank";
      a.onclick   =()=>a.remove();
      document.documentElement.appendChild(a);
      a.click();
    }
  }
  
  
  
  function renderVideo(audioElement,videoElement,bitsPerSecond,callback){
    // simple passthrough, dont do anything special here. leave it all on default.
    // assume this is called at onloadedmetadata
    // todo - fix audio bug with iOS
    // todo - see if you can make it render faster than realtime by breaking up video into chunks
    // and rendering them all at once
    var audioTrack;
    var videoTrack;
    
    if(audioElement){
      console.log("audio = true");
      var audioContext      = new AudioContext();
      var audioSource       = audioContext.createMediaElementSource(audioElement);
      var audioDestination  = audioContext.createMediaStreamDestination();
      var audioStream       = audioDestination.stream;
      audioSource.connect(audioDestination);
      audioTrack            = audioStream.getAudioTracks()[0];
    }
    
    if(videoElement){
      console.log("video = true");
      var canvas    = document.createElement("canvas");
      canvas.width  = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      var context   = canvas.getContext("2d");
      !function(){
        context.drawImage(videoElement,0,0,canvas.width,canvas.height);
        requestAnimationFrame(arguments.callee);
      }();
      var canvasStream  = canvas.captureStream(30);
      videoTrack        = canvasStream.getVideoTracks()[0];
    } 
    
    // combine streams  
    var combinedStream  = new MediaStream();
    videoTrack&&combinedStream.addTrack(videoTrack);
    audioTrack&&combinedStream.addTrack(audioTrack);
    
    // create mediaRecorder
    var mediaRecorder=new MediaRecorder(combinedStream,{
      bitsPerSecond : bitsPerSecond,
      mimeType      : (isIOS()||isIPadOS())?"video/mp4":"video/webm",
    });
    
    // audio and video
    (audioElement&&videoElement)&&(function(){
      var videoPlaying=false;
      var audioPlaying=false;
      videoElement.onplay   =()=>{ videoPlaying=true  };
      videoElement.onended  =()=>{ videoPlaying=false };
      audioElement.onplay   =()=>{ audioPlaying=true  };
      audioElement.onended  =()=>{ audioPlaying=false };
      when(()=>videoPlaying||audioPlaying,()=>{
        mediaRecorder.start();
        console.log("recording started");
        when(()=>!videoPlaying&&!audioPlaying,()=>{
          mediaRecorder.stop();
          console.log("recording stopped");
        });
      });
    })();
    
    // video with no audio
    (!audioElement&&videoElement)&&(function(){
      videoElement.onplay=()=>{
        mediaRecorder.start();
        console.log("recording started");
      };
      videoElement.onended=()=>{
        mediaRecorder.stop();
        console.log("recording stopped");
      };
    })();
    
    // audio with no video
    (audioElement&!videoElement)&&(function(){
      audioElement.onplay=()=>{
        mediaRecorder.start();
        console.log("recording started");
      };
      audioElement.onended=()=>{
        mediaRecorder.stop();
        console.log("recording stopped");
      };
    })();
    
    // no video or audio (empty video file i guess??)
    (!audioElement&!videoElement)&&(function(){
      mediaRecorder.start();
      console.log("recording started");
      mediaRecorder.stop();
      console.log("recording stopped");
    })();
    
    // capture
    var recordedBlobs=[];
    
    mediaRecorder.onstart=function(event){
      console.info("recorder started");
    };
      
    mediaRecorder.onstop=function(event){
      console.info("recorder stopped");
      console.log("Recorded Blobs: ",recordedBlobs);
      var type  = (recordedBlobs[0]||{}).type;
      var blob  = new Blob(recordedBlobs,{type:type.replace(/;(.*)/,"")});
      callback(blob);
    };
      
    mediaRecorder.ondataavailable=function(event){
      if(event.data&&event.data.size>0){
        console.log("data chunk added");
        recordedBlobs.push(event.data);
      }
    };
    
    videoElement&&videoElement.play();
    audioElement&&audioElement.play();
  }
  
  
  
  document.body.appendChild(createButton("<convert>",()=>{
    uploadVideo((file)=>{
      
      var audio = document.createElement("audio");
      audio.src = URL.createObjectURL(file);
      audio.playsInline = true;
      audio.controls    = true;
      document.body.appendChild(audio);
      
      var video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.playsInline = true;
      video.controls    = true;
      document.body.appendChild(video);
      
      var audioLoaded=false;
      var videoLoaded=false;
      
      audio.onloadedmetadata=()=>{
        audioLoaded=true;
        console.log("audio loaded");
      };
      video.onloadedmetadata=()=>{
        videoLoaded=true;
        console.log("video loaded");
      };
      
      when(()=>audioLoaded&&videoLoaded,()=>{
        // for some reason trying to use mediarecorder with audio will break the combined stream on iOS so for now, no audio on iOS
        renderVideo((isIOS()||isIPadOS())?null:audio,video,0,(res)=>{
          console.log(res);
          if(isIOS()||isIPadOS()){
            document.body.appendChild(createButton("<download>",()=>{
              downloadVideo(res);
            }));
          }else{
            downloadVideo(res);
          }
        });
      });
    });
  }));
  
  
};
