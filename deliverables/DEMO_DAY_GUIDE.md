# Sentinel – Demo Day Guide (PDL-2 Final Review)

## Deliverables in this folder

| File | What it is |
|---|---|
| `Sentinel_PDL2_Report.docx` / `.pdf` | 44-page report in the R.M.K. sample format (edit the .docx, export PDF from Word) |
| `Sentinel_PDL2_Final_Review.pptx` | 18-slide final review deck, speaker notes on the title and problem slides |
| `Sentinel_PDL2_Demo_Video.mp4` (+ `.srt`) | 4 min 39 s narrated walkthrough, 1080p, captions burned in |
| `assets/` | Screenshots, diagrams and logo used by the report, deck and video |
| `src/` | Scripts that regenerate everything (see bottom) |

## Before the review (10 minutes)

1. Double-click `run.bat` in the repo root. Without Docker it starts in standalone mode (SQLite, AI inline) and also starts llama-server with `D:\JARVIS\models\qwen3.5-9b\Qwen3.5-9B-UD-IQ3_XXS.gguf`.
2. Wait until the browser opens on http://localhost:5173. The first AI run loads models, so submit one throwaway report first, then reset (step 3).
3. Reset the demo state (removes live reports, restores INC-DEMO002 and every responder's status):

   ```
   .venv\Scripts\python.exe deliverables\src\clean_live_reports.py
   ```

4. Keep the internet on: the map tiles come from OpenStreetMap.
5. Keep `Sentinel_PDL2_Demo_Video.mp4` open in a second window as a fallback.

## Live demo click path (≈ 3 minutes, mirrors the video)

1. **Citizen Portal** → choose **Road Accident** → describe "MTC bus skidded and hit a two-wheeler near Kathipara junction…" → attach a photo → **Use my location** (or type 13.0069 / 80.2061) → **Submit Emergency Report**.
2. Show the **Tracking ID** → **Track Status** tab → paste the ID → Reported → AI Processing → Verified (takes ~5–10 s).
3. **Dispatcher sign-in**: `dispatcher@sentinel.gov` / `admin123` (seed account).
4. Dashboard: point at the summary cards, zoom the map out once, tick **Heatmap Overlay**, point at the priority-sorted feed.
5. Type the tracking ID in the feed filter → open it → show the photo, severity, the AI-extracted JSON and `ai_provenance`.
6. Filter "Ranganathan" → open the **Electrical Hazard** report ("there is a fire in the transformer box…") → it is one of 3 merged reports → scroll to **Nearest available responders** → **Dispatch** Officer Priya Nair (≈0.1 km).
7. **Analytics** tab: category and status breakdown, average time to dispatch and resolve.

Run `clean_live_reports.py` again before a second run-through. Step 6 only works once per reset, because it marks Priya Nair BUSY.

## Things to check / fill in

- Supervisor designation is written as **Assistant Professor** for Ms. Sumitha T, and her degrees are not listed. Correct both in the report's bonafide certificate if needed.
- The report's acknowledgement thanks Ms. Sumitha T as both Lab In-charge and Supervisor, as instructed.

## Regenerating

From `deliverables/src` (Python with python-docx, pywin32 and PyMuPDF; Word and PowerPoint installed):

- Report: `python build_report.py` (two passes, so page numbers come from Word's own pagination)
- Deck: `node build_ppt.js <node_modules with pptxgenjs, react-icons, sharp> [pptx skill dir]`
- Video: generate narration from `video_script.json` with Windows TTS (voice "Microsoft Ravi"), run `record_demo.js` against a running app, then `python assemble_video.py <work dir> <rec dir>`
