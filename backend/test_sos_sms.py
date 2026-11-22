import os
os.environ["OFFICER_API_KEY"] = "test-key"
from fastapi.testclient import TestClient
from main import app

def test_sos_sms(monkeypatch):
    monkeypatch.setenv('SMS_MODE','demo')
    monkeypatch.setenv('SMS_TEST_RECIPIENTS','+919999999999')
    with TestClient(app) as client:
        sos=client.post('/api/sos',json={'ward_id':1,'name':'Test Citizen','message':'Water rising near home','lat':19.072,'lon':72.879})
        assert sos.status_code==201, sos.text
        sid=sos.json()['id']; rid=sos.json()['rescue_id']
        assert any(x['id']==sid for x in client.get('/api/sos').json())
        assert any(x['id']==rid for x in client.get('/api/rescue-requests').json())
        assert client.post('/api/sms-alerts',json={'ward_id':1,'severity':'high','message':'This is a test'}).status_code==403
        sent=client.post('/api/sms-alerts',headers={'x-officer-key':'test-key'},json={'ward_id':1,'severity':'high','message':'This is a test'})
        assert sent.status_code==201, sent.text
        assert sent.json()['delivery_status']=='simulated-not-sent'
        logs=client.get('/api/sms-alerts/logs',headers={'x-officer-key':'test-key'})
        assert logs.status_code==200 and logs.json()
