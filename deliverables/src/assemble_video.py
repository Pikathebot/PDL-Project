"""Assemble the Sentinel demo video from slide images, the Playwright recording and TTS narration.

    python assemble_video.py <work dir>

<work dir> holds audio/<id>.wav, slides/sNN.png (1920x1080), rec/demo.webm and rec/marks.json.
Writes deliverables/Sentinel_PDL2_Demo_Video.mp4 (captions burned in) and a matching .srt.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORK = sys.argv[1]
REC = os.path.join(WORK, sys.argv[2] if len(sys.argv) > 2 else "rec")
SEGS = json.load(open(os.path.join(HERE, "video_script.json"), encoding="utf-8"))
MARKS = json.load(open(os.path.join(REC, "marks.json")))
OUT = os.path.join(ROOT, "Sentinel_PDL2_Demo_Video.mp4")
SRT = os.path.join(ROOT, "Sentinel_PDL2_Demo_Video.srt")
LEAD, TAIL = 0.35, 0.6          # silence before / after each narration line
VENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30"]
AENC = ["-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2"]


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", path]))


def ts(t):
    h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"


parts, cues, clock = [], [], 0.0
os.makedirs(os.path.join(WORK, "parts"), exist_ok=True)
for i, seg in enumerate(SEGS):
    wav = os.path.join(WORK, "audio", seg["id"] + ".wav")
    adur = duration(wav)
    part = os.path.join(WORK, "parts", f"{i:02d}_{seg['id']}.mp4")
    audio = ["-i", wav]
    afilter = f"[1:a]adelay={int(LEAD * 1000)}|{int(LEAD * 1000)},apad[a]"
    if seg["kind"] == "slide":
        total = adur + LEAD + TAIL
        img = os.path.join(WORK, "slides", f"s{seg['slide']:02d}.png")
        vf = f"[0:v]scale=1920:1080,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st={total - 0.4:.2f}:d=0.4[v]"
        run(["-loop", "1", "-t", f"{total:.3f}", "-i", img, *audio, "-filter_complex", f"{vf};{afilter}",
             "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}", *VENC, *AENC, part])
    else:
        start, end = MARKS[seg["id"]]
        total = max(end - start, adur + LEAD + 0.2)
        vf = (f"[0:v]trim=start={start:.3f}:end={start + total:.3f},setpts=PTS-STARTPTS,"
              f"scale=1920:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=2[v]")
        run(["-i", os.path.join(REC, "demo.webm"), *audio, "-filter_complex", f"{vf};{afilter}",
             "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}", *VENC, *AENC, part])
    # Captions: split into sentences, time them by character share of the narration.
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", seg["text"]) if s.strip()]
    chunks = []
    for s in sentences:   # greedy wrap so each caption stays around two lines
        cur = ""
        for w in s.split():
            if cur and len(cur) + 1 + len(w) > 90:
                chunks.append(cur); cur = w
            else:
                cur = f"{cur} {w}".strip()
        if cur: chunks.append(cur)
    total_chars = sum(len(c) for c in chunks)
    t = clock + LEAD
    for c in chunks:
        d = adur * len(c) / total_chars
        cues.append((t, t + d, c)); t += d
    parts.append(part)
    clock += duration(part)
    print(f"{seg['id']:4s} {duration(part):6.2f}s")

with open(SRT, "w", encoding="utf-8") as f:
    for n, (a, b, c) in enumerate(cues, 1):
        f.write(f"{n}\n{ts(a)} --> {ts(b)}\n{c}\n\n")

listfile = os.path.join(WORK, "parts", "list.txt")
with open(listfile, "w") as f:
    for p in parts:
        f.write(f"file '{p.replace(os.sep, '/')}'\n")
joined = os.path.join(WORK, "parts", "joined.mp4")
run(["-f", "concat", "-safe", "0", "-i", listfile, "-c", "copy", joined])

# Burn captions. The subtitles filter needs a path without a drive colon, so run from the SRT's folder.
style = ("FontName=Arial,FontSize=11,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H99000000,"
         "BorderStyle=3,Outline=1,Shadow=0,MarginV=12,Alignment=2")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", joined, "-vf",
                f"subtitles={os.path.basename(SRT)}:force_style='{style}'",
                *VENC, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", *AENC, "-movflags", "+faststart", OUT], check=True, cwd=os.path.dirname(SRT))
print(f"wrote {OUT}  ({duration(OUT):.1f}s)")
