import librosa, numpy as np
SR=22050; hop=512; fps=SR/hop
y,_=librosa.load("../audio/p-of-us.mp3",sr=SR,mono=True)
b=np.load("work/beats_dyn.npy"); db=b[3::4]
# REPET-SIM vocal separation (librosa docs recipe)
S_full, phase = librosa.magphase(librosa.stft(y, n_fft=2048, hop_length=hop))
S_filter = librosa.decompose.nn_filter(S_full, aggregate=np.median, metric='cosine', width=int(librosa.time_to_frames(2, sr=SR, hop_length=hop)))
S_filter = np.minimum(S_full, S_filter)
mask_v = librosa.util.softmask(S_full - S_filter, 10 * S_filter, power=2)
S_v = mask_v * S_full
freqs=librosa.fft_frequencies(sr=SR,n_fft=2048)
band=(freqs>200)&(freqs<4000)
voc=np.sqrt((S_v[band]**2).mean(axis=0))
mix=np.sqrt((S_full**2).mean(axis=0))
lowe=np.sqrt((S_full[freqs<150]**2).mean(axis=0))
hie=np.sqrt((S_full[freqs>5000]**2).mean(axis=0))
np.save("work/voc_env.npy",voc); np.save("work/mix_env.npy",mix); np.save("work/low_env.npy",lowe); np.save("work/hi_env.npy",hie)
def per(env,t0,t1):
    i0,i1=int(t0*fps),int(t1*fps); return env[i0:max(i1,i0+1)].mean()
edges=np.r_[0,db,len(y)/SR]
mfcc=librosa.feature.mfcc(y=y,sr=SR,hop_length=hop,n_mfcc=13)
chroma=librosa.feature.chroma_cqt(y=y,sr=SR,hop_length=hop)
F=[]
rows=[]
vmax=np.percentile(voc,99); mmax=np.percentile(mix,99); lmax=np.percentile(lowe,99); hmax=np.percentile(hie,99)
for k in range(len(edges)-1):
    t0,t1=edges[k],edges[k+1]
    rows.append((k-1,t0,per(mix,t0,t1)/mmax,per(lowe,t0,t1)/lmax,per(hie,t0,t1)/hmax,per(voc,t0,t1)/vmax))
    i0,i1=int(t0*fps),int(t1*fps)
    F.append(np.r_[librosa.util.normalize(mfcc[:,i0:i1].mean(1)),chroma[:,i0:i1].mean(1)])
F=np.array(F)
np.save("work/barfeat.npy",F)
import json
json.dump([dict(bar=r[0],t=round(float(r[1]),3),mix=round(float(r[2]),2),low=round(float(r[3]),2),hi=round(float(r[4]),2),voc=round(float(r[5]),2)) for r in rows],open("work/bars.json","w"))
for r in rows:
    bar,t,m,l,h,v=r
    print(f"bar {bar:3d} {int(t//60)}:{t%60:05.2f}  mix{m:5.2f} low{l:5.2f} hi{h:5.2f} voc{v:5.2f} |"+"m"*int(m*20)+" "+"v"*int(v*20))
