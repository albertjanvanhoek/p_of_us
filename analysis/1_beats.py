import os; os.makedirs("work", exist_ok=True)
import librosa, numpy as np
SR=22050; hop=256
y,_=librosa.load("../audio/p-of-us.mp3",sr=SR,mono=True)
yh,yp=librosa.effects.hpss(y)
oe=librosa.onset.onset_strength(y=yp,sr=SR,hop_length=hop)
tempo,b=librosa.beat.beat_track(onset_envelope=oe,sr=SR,hop_length=hop,start_bpm=129.5,tightness=400,units='time')
ibi=np.diff(b)
print("n beats",len(b),"median ibi %.4f -> %.3f bpm"%(np.median(ibi),60/np.median(ibi)))
print("ibi pct 5/50/95",np.percentile(ibi,[5,50,95]).round(4))
# linear fit beat index vs time
k=np.arange(len(b)); A=np.vstack([k,np.ones_like(k)]).T
coef,res,_,_=np.linalg.lstsq(A,b,rcond=None)
resid=b-(A@coef)
print("linear fit period %.5f (%.3f bpm) t0 %.3f, resid sd %.1f ms, max %.1f ms"%(coef[0],60/coef[0],coef[1],resid.std()*1000,np.abs(resid).max()*1000))
# rolling resid
for s in range(0,len(b),32):
    print(f"beat {s:3d} t={b[s]:6.1f}  resid {resid[s:s+32].mean()*1000:+6.1f} ms")
np.save("work/beats_dyn.npy",b)
np.save("work/oe_perc.npy",oe)
