import json, re
A=json.load(open("../data/audio.json")); L=json.load(open("../lyrics/lyrics_sheet.json"))
beats=A['beats']; db=A['downbeats']; sec={s['name']:s for s in A['sections']}
win=dict((k,(sec[k]['start'],sec[k]['end'])) for k in sec if k!='intro' and k!='outro')
win['outro_a']=(db[110],db[114]); win['outro_b']=(db[114],A['duration']-1.0)
def snap(t): return min(beats,key=lambda b:abs(b-t))
def syl(w): return max(1,len(re.findall(r'[aeiouy]+',w.lower())))
lines=[];i=0
for name in ["verse1","pre1","chorus1","verse2","pre2","chorus2","bridge","build","stop","chorus3","outro_a","outro_b"]:
    t0,t1=win[name]; ls=L[name]; slot=(t1-t0)/len(ls)
    for j,txt in enumerate(ls):
        s=snap(t0+j*slot); e=s+slot*0.85
        ws=txt.split(); tot=sum(syl(w) for w in ws); acc=0; words=[]
        for w in ws:
            a=s+(e-s)*acc/tot; acc+=syl(w); b=s+(e-s)*acc/tot
            words.append({'w':w,'start':round(a,3),'end':round(b,3),'conf':0.0})
        lines.append({'i':i,'section':name.split('_')[0],'start':round(s,3),'end':round(e,3),'text':txt,'words':words,'est':True}); i+=1
out={'lines':lines,'extras':[],'notes':("ESTIMATED timings, not aligned to the vocal: each section's lines are spread evenly over the section window "
 "from audio.json and snapped to the nearest beat; words are spread by syllable count. Use only for previewing layouts. Replace with real timings "
 "(tap them with lyric-tapper.html, or run forced alignment locally) and save as data/lyrics.json. Lyric text = the version AJ posted on 2026-10-03; "
 "the sung version may differ (the generator dropped the post-chorus).")}
json.dump(out,open("../data/lyrics.approx.json","w"),ensure_ascii=False,indent=1)
print(len(lines),"lines"); 
for l in lines[::6]: print(f"{l['start']:7.2f} {l['section']:8s} {l['text']}")
