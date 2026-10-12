"""Re-voice the Sentinel narration with edge-tts (neural en-IN).  python synth_voice.py <script.json> <audio dir> [voice] [rate]"""
import asyncio, json, os, subprocess, sys
import edge_tts

SCRIPT, OUT = sys.argv[1], sys.argv[2]
VOICE = sys.argv[3] if len(sys.argv) > 3 else "en-IN-PrabhatNeural"
RATE = sys.argv[4] if len(sys.argv) > 4 else "+0%"

# Spoken-only respellings; captions keep the original text.
SAY = [
    ("R.M.K.", "R M K"), ("Ms. Sumitha T,", "Miss Sumitha T,"), ("T. Nagar", "T Nagar"),
    ("Qwen 3.5", "Kwen three point five"), ("llama dot c p p", "llama dot C P P"),
    ("FastAPI", "Fast A P I"), ("PostgreSQL", "Postgres"), ("EXIF", "Exif"),
    ("k d tree", "K D tree"), ("YOLO version 8", "YOLO version eight"),
    ("the 112 emergency", "the one one two emergency"),
]


def spoken(text):
    for a, b in SAY:
        text = text.replace(a, b)
    return text


async def main():
    os.makedirs(OUT, exist_ok=True)
    for seg in json.load(open(SCRIPT, encoding="utf-8")):
        mp3 = os.path.join(OUT, seg["id"] + ".mp3")
        await edge_tts.Communicate(spoken(seg["text"]), VOICE, rate=RATE).save(mp3)
        wav = os.path.join(OUT, seg["id"] + ".wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", "48000", "-ac", "1", wav], check=True)
        os.remove(mp3)
        print(seg["id"], "ok")

asyncio.run(main())
