import os, subprocess, imageio_ffmpeg, whisper, json
ff=imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ff,'-y','-i',r'C:\Users\MTBH\Downloads\BTN2.mp4','-vn','-ac','1','-ar','16000','video-review/audio.wav'],capture_output=True,check=True)
import whisper.audio
import numpy as np, wave
with wave.open('video-review/audio.wav') as w:
 audio=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
model=whisper.load_model('small')
result=model.transcribe(audio,language='vi',fp16=False)
with open('video-review/transcript.json','w',encoding='utf-8') as f: json.dump(result,f,ensure_ascii=False,indent=2)
for s in result['segments']: print(round(s['start'],1),round(s['end'],1),s['text'])
