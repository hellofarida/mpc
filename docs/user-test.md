# User test kit (3–5 people, about 10 minutes each)

Goal: KPI 1 (time to find a garden and what lives there, app vs the PDF, target under 30 s) and KPI 2 (where people drop off).
Don't help or explain. Say "think aloud". Use each person's own phone. Half start with the app, half with the PDF (Heartscapes' Nov 2025 PDF), so order doesn't bias the result.

## Tasks (read one at a time)
1. **Find** the garden nearest to where you are now, and tell me one thing that lives there. Start the stopwatch at "go", stop when they say it. Do it once with the PDF and once with the app (a different garden each time).
2. **Check in** at that garden (pretend you arrived).
3. **Ask** the garden a question of your choice.
4. **Plan a walk** through 3 gardens and open it in your maps app.
5. **Log a sighting** or **volunteer**: show me where you'd tap.

## Record per person
| # | Device | Started with | Task 1 PDF (s) | Task 1 app (s) | Got stuck at | Asked question (what/answer ok?) | Walk opened in maps? (4-stop on Android/iPhone) | Said unclear / liked |
|---|---|---|---|---|---|---|---|---|

Drop-off = the last task a person completed. Arrivals are only an estimate (directions tap followed by a check-in).

## Afterwards, ask
- Did you know which gardens are part of the corridor?
- Was it clear the summary and chat answers are written by AI?
- Anything you expected that wasn't there?

## Before the session
- `npm run eval:chat` → 20/20 (numbers in the AI answers match the saved data). Last run: 20/20, no template fallbacks.
- `npm run summaries` output reviewed by hand for all 8 gardens.
- Deployed URL on the phones works; the CSP check done on the production build (not only dev).
- Test a 4-stop walk on one Android phone and one iPhone (Apple Maps opens the first stop only).
- Spend limit set in the Claude Console.
