import cv2
from PIL import Image, ImageDraw
c=cv2.VideoCapture(r'C:\Users\MTBH\Downloads\BTN2.mp4')
fps=c.get(5); duration=c.get(7)/fps
print('duration',duration,'fps',fps,'size',c.get(3),c.get(4))
times=list(range(0,int(duration),15))
out=Image.new('RGB',(1200,((len(times)+3)//4)*195),'#222222')
d=ImageDraw.Draw(out)
for i,t in enumerate(times):
 c.set(cv2.CAP_PROP_POS_MSEC,t*1000)
 ok,f=c.read()
 if ok:
  im=Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB)); im.thumbnail((300,169))
  x=(i%4)*300; y=(i//4)*195
  out.paste(im,(x,y)); d.text((x+5,y+171),str(t)+'s',fill='white')
out.save('video-review/contact.jpg')
