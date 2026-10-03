"""P(us) music analysis -> data/audio.json (format compatible with the pdoom-video engine).
Full-mix analysis only (no stem separation was available): 'vocal', 'drums', 'bass', 'other'
are approximations from HPSS + REPET-SIM masking, not true stems."""
import librosa, numpy as np, json
from scipy.signal import find_peaks
SR=44100; FPS=100; HOP=SR//FPS
y,_=librosa.load("../audio/p-of-us.mp3",sr=SR,mono=True)
dur=len(y)/SR
beats=np.load("work/beats_dyn.npy")            # dynamic beat tracker (tempo drifts upward over the song)
downbeats=beats[3::4]                      # bar phase from chord-change novelty (changes on beat idx = 3 mod 4)
ibi=np.diff(beats)

# ---- envelopes ----
NFFT=4096
S=np.abs(librosa.stft(y,n_fft=NFFT,hop_length=HOP))
f=librosa.fft_frequencies(sr=SR,n_fft=NFFT)
H,P=librosa.decompose.hpss(S,margin=2.0)
Sf=librosa.decompose.nn_filter(S,aggregate=np.median,metric='cosine',width=int(2*FPS))
Sf=np.minimum(S,Sf)
mv=librosa.util.softmask(S-Sf,10*Sf,power=2)
V=mv*H
def rms(M,lo=None,hi=None):
    m=np.ones_like(f,bool)
    if lo: m&=f>=lo
    if hi: m&=f<hi
    return np.sqrt((M[m]**2).mean(0))
def smooth(x,att=0.010,rel=0.090):
    a=np.exp(-1/(att*FPS)); r=np.exp(-1/(rel*FPS)); out=np.zeros_like(x); s=0
    for i,v in enumerate(x):
        c=a if v>s else r; s=c*s+(1-c)*v; out[i]=s
    return out
def norm(x):
    x=smooth(x); p=np.percentile(x,99)+1e-12; return np.clip(x/p,0,1)
env={
 'rms':norm(rms(S)),'low':norm(rms(S,None,150)),'mid':norm(rms(S,150,2000)),'high':norm(rms(S,4000,None)),
 'vocal':norm(rms(V,200,4000)),'drums':norm(rms(P)),'bass':norm(rms(H,None,250)),'other':norm(rms(H-V.clip(0)*0,250,None)),
}
n=int(np.ceil(dur*FPS))
for k in env: env[k]=[round(float(v),3) for v in np.r_[env[k],np.zeros(max(0,n-len(env[k])))][:n]]

# ---- onsets (from percussive / vocal-masked spectra) ----
def onsets(M,lo,hi,dist=0.09,thr=0.25):
    m=(f>=lo)&(f<hi) if hi else (f>=lo)
    e=np.log1p(M[m]*10).sum(0); d=np.maximum(0,np.diff(e,prepend=e[0]))
    d=d/ (np.percentile(d,99.5)+1e-9)
    pk,_=find_peaks(d,height=thr,distance=int(dist*FPS))
    return [[round(i/FPS,3),round(float(min(1,d[i])),3)] for i in pk]
ons={'kick':onsets(P,30,120,0.2,0.3),'snare':onsets(P,1500,5000,0.2,0.3),'hat':onsets(P,7000,None,0.1,0.3),'vocal':onsets(V,200,4000,0.12,0.3)}

# ---- sections (estimated; see notes) ----
def bar(k): return float(downbeats[k]) if k<len(downbeats) else dur
SEC=[('intro',None,11,'medium'),('verse1',11,26,'low'),('pre1',26,32,'low'),('chorus1',32,42,'high'),
     ('verse2',42,54,'high'),('pre2',54,60,'medium'),('chorus2',60,70,'high'),
     ('bridge',70,80,'medium'),('build',80,90,'medium'),('stop',90,93,'high'),
     ('chorus3',93,110,'high'),('outro',110,None,'medium')]
sections=[{'name':nm,'start':round(0.0 if a is None else bar(a),3),'end':round(dur if b is None else bar(b),3),'bars':[a,b],'confidence':c} for nm,a,b,c in SEC]

out={'duration':round(dur,3),'bpm':round(float(60/np.median(ibi)),3),'beat_period':round(float(np.median(ibi)),5),
 'tempo_drift':{'start_bpm':round(float(60/np.median(ibi[:64])),1),'end_bpm':round(float(60/np.median(ibi[-64:])),1)},
 'time_signature':4,'beats':[round(float(b),3) for b in beats],'downbeats':[round(float(b),3) for b in downbeats],
 'sections':sections,'fps':FPS,**env,'onsets':ons,
 'notes':("Generated from the mixed mp3 only (no Demucs stems / no ASR were available in the analysis environment). "
  "Beats: dynamic beat tracker on the percussive component; the tempo is NOT constant (Suno render drifts upward, roughly 126 BPM in the intro to 129-132 BPM later), "
  "so use the beats[] list, never a fixed period. Downbeats: bar phase from harmonic change novelty (chords change on beat index 3 mod 4); "
  "bar k starts at downbeats[k]. Sections: estimated from energy, low-band dropouts and bar self-similarity (chorus1 bars 32-41 repeat at 60-69); "
  "'confidence' says how sure; verse1/pre1 boundary is a guess. The post-chorus written in the lyric sheet does not appear as a separate block after chorus1 (likely omitted by the generator) - check by ear. "
  "Envelopes: 100 fps, one-pole smoothed (10 ms attack / 90 ms release), divided by own 99th percentile, clipped 0..1. "
  "vocal = REPET-SIM foreground mask on the harmonic part (rough proxy), drums = percussive part, bass = harmonic <250 Hz, other = harmonic >250 Hz. "
  "Onsets [time, strength]: kick/snare/hat from band-limited spectral flux of the percussive part; vocal from the masked foreground. "
  "Re-run the pdoom-video analysis tools (Demucs + forced alignment) locally for production-grade stems and word timings.")}
json.dump(out,open("../data/audio.json","w"))
print("beats",len(beats),"downbeats",len(downbeats),"bpm",out['bpm'],out['tempo_drift'])
for s in sections: print(f"{s['name']:8s} {s['start']:7.2f} - {s['end']:7.2f}  bars {s['bars']}  {s['confidence']}")
print({k:len(v) for k,v in ons.items()})
