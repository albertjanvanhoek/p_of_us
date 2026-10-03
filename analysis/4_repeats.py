import numpy as np, json
F=np.load("work/barfeat.npy")  # index 0 = bar -1
F=(F-F.mean(0))/(F.std(0)+1e-9)
F=F/np.linalg.norm(F,axis=1,keepdims=True)
S=F@F.T
def seg(a,b): return np.arange(a+1,b+1)  # bars a..b -> indices
def sim(A,B,L=6):
    # diagonal similarity of L bars starting at bars A,B
    return float(np.mean([S[A+1+i,B+1+i] for i in range(L)]))
cands=range(0,112)
ref=34
print("similarity of 6-bar block starting at bar X to chorus1 block (bar 34):")
sc=[(sim(ref,x),x) for x in cands if abs(x-ref)>3]
for s,x in sorted(sc,reverse=True)[:12]: print(f"  bar {x:3d}  {s:.2f}")
ref=42
print("to verse2 block (bar 42):")
sc=[(sim(ref,x),x) for x in cands if abs(x-ref)>3]
for s,x in sorted(sc,reverse=True)[:8]: print(f"  bar {x:3d}  {s:.2f}")
ref=28
print("to pre-chorus? block (bar 28, L=4):")
sc=[(sim(ref,x,4),x) for x in cands if abs(x-ref)>3]
for s,x in sorted(sc,reverse=True)[:8]: print(f"  bar {x:3d}  {s:.2f}")
