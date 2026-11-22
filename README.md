# CIV-02 · SOS + SMS full-stack demo

Simple React + FastAPI + SQLite project. **Not an operational emergency service.**

## Start backend (Terminal 1)
```bash
cd backend
pip install -r requirements.txt
export SMS_MODE=demo
export SMS_TEST_RECIPIENTS=+919999999999
uvicorn main:app --reload
```

## Start frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 and http://localhost:8000/docs. If ports are occupied, stop older servers with Control+C.

## How to test SOS
1. Open **SOS**, enter name, choose locality and skill, enter a short description.
2. Optionally click **Use my location** and allow location permission.
3. Click **SOS · Submit test request**. A new SOS ID appears.
4. Open **Rescue**. The linked rescue request appears on the dispatch board. To assign a volunteer, use the Rescue workflow's matching feature for a new rescue request, or call `/api/rescue-requests/{id}/matches` then `/assign` in Swagger.
5. Refresh: SOS requests remain saved in SQLite.

## How to test SMS
1. In the backend terminal set `SMS_TEST_RECIPIENTS` to **your own consenting test number**. Restart backend.
2. Open **Alerts**, scroll to **SMS Alert · Test Recipients Only**, enter a message and click **Run SMS test**.
3. The status should read `simulated-not-sent`; click **View SMS test logs**. Logs are persisted in SQLite.
4. No real SMS is sent in default `SMS_MODE=demo`.

### Optional real Twilio SMS to test numbers
Configure `SMS_MODE=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, and `SMS_TEST_RECIPIENTS` in the **backend process environment**. Install requirements, including `twilio`. Restart the backend. The backend only sends to the explicitly configured test recipients (max 3), with `[CIV-02 TEST]` prefix. Provider acceptance does **not** prove handset delivery. Twilio trial accounts may require verified recipients; India sender and regulatory restrictions may apply. Never use for public alerts or real dispatch.

## Explanation for judges
- SOS form sends a POST request to `/api/sos`. FastAPI saves the SOS and creates a linked rescue request in SQLite.
- The Rescue board reads that same database. Volunteers can be assigned by an officer using existing rescue endpoints.
- SMS test uses `/api/sms-alerts`: FastAPI saves an alert, processes only allowlisted test numbers, and stores a log per number. `demo` simulates; optional `twilio` sends a real test SMS.
- Locality names are frontend labels; database still uses original ward IDs.

## Limits
- SOS does not call police, ambulance or emergency services. There is no automatic dispatch or citizen notification.
- Phone numbers are stored in local demo database; use fictitious values for SOS unless you have permission.
- This project has a **hardcoded local demo officer key in the browser**, not real authentication. Do not expose publicly until replaced with secure role-based auth.
- Ward-specific SMS subscriber lists, inbound SMS SOS, rate limits, and reliable delivery receipts are not implemented.
- Risk scoring and 2005 replay are simulated.
