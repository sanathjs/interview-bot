# Challenges & Problem Solving Stories

## Challenge 1 — Integrating Multiple Third-Party Platforms at Ingenio
Situation: The Keen platform required integrating Zinrelo (loyalty rewards), Iterable (marketing),
Zendesk (support), and Content Stack (CMS) — each with different APIs, data models, and reliability SLAs.
How I approached it: I mapped out the data flows between systems first, identified failure points,
and designed a resilient integration layer with proper error handling, retries, and fallback strategies.
I used centralized logging via Splunk to monitor all integration touchpoints.
Solution: Built a modular integration architecture where each third-party service was wrapped in its
own adapter, making the system easier to debug and swap out if needed.
Learning: Designing for failure from the start (circuit breakers, retries, dead letter queues) is
far cheaper than retrofitting resilience later.

## Challenge 2 — Transitioning from Senior Engineer to Tech Lead at Euromonitor
Situation: At Euromonitor, I grew from Senior Software Engineer into a Tech Lead role, which required
shifting from individual contributor work to guiding a team on the Passport market research platform.
How I handled it: I had to consciously balance writing code myself with reviewing others' code and
making broader architectural decisions. I focused on clear documentation and regular team syncs
to keep everyone aligned.
Outcome: The team delivered the Passport platform features on time and I developed my leadership
skills that I carried into my Lead role at Ingenio.
Learning: Technical leadership is a skill in itself — it requires deliberate practice, not just
being the best coder in the room.

## Challenge 3 — Healthcare Data Accuracy at Capgemini (CarePricer)
What happened: While working on CarePricer, patient bill estimates were occasionally miscalculated
due to discrepancies between payer contract data and historical charge data — a significant issue
in a healthcare context where patients rely on these estimates.
How I handled it: I traced the issue through the data pipeline, identified the mismatch in how
payer contract updates were being applied, and worked with the data team to implement validation
checks and reconciliation processes.
What I changed after: We introduced automated data consistency checks as part of the ingestion
pipeline so discrepancies were caught before they reached the estimation engine.
