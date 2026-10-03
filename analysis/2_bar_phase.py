import librosa, numpy as np
from scipy.signal import butter, sosfiltfilt
SR=22050; hop=256; fps=SR/hop
y,_=librosa.load("../audio/p-of-us.mp3",sr=SR,mono=True)
b=np.load("work/beats_dyn.npy")
def band(lo,hi):
    sos=butter(4,[lo,hi],btype='band',fs=SR,output='sos') if lo and hi else (butter(4,hi,btype='low',fs=SR,output='sos') if hi else butter(4,lo,btype='high',fs=SR,output='sos'))
    return sosfiltfilt(sos,y)
lo=librosa.onset.onset_strength(y=band(None,110),sr=SR,hop_length=hop)
sn=librosa.onset.onset_strength(y=band(1800,5000),sr=SR,hop_length=hop)
def at(env,t):
    i=np.round(t*fps).astype(int); i=i[(i>=0)&(i<len(env))]
    # max in +-2 frames
    return np.array([env[max(0,j-2):j+3].max() for j in i])
L=at(lo,b); S=at(sn,b)
chroma=librosa.feature.chroma_cqt(y=y,sr=SR,hop_length=hop)
bf=np.round(b*fps).astype(int)
cs=librosa.util.sync(chroma,bf,aggregate=np.median)
cs=cs/ (np.linalg.norm(cs,axis=0,keepdims=True)+1e-9)
nov=np.r_[0,1-np.sum(cs[:,1:-1]*cs[:,:-2],axis=0)] if cs.shape[1]>2 else None
nov=1-np.sum(cs[:,1:]*cs[:,:-1],axis=0); nov=np.r_[0,nov][:len(b)]
for m in (4,8):
    print(f"mod {m}: chord-change", [round(float(nov[k::m].mean()),3) for k in range(m)])
print("mod 4: kick",[round(float(L[k::4].mean()),2) for k in range(4)]," snare",[round(float(S[k::4].mean()),2) for k in range(4)])
