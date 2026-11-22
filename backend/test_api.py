import os, tempfile
p=tempfile.mktemp(suffix='.db')
os.environ['DATABASE_URL']='sqlite:///'+p
os.environ['OFFICER_API_KEY']='test-key'
from fastapi.testclient import TestClient
from main import app

def test_core_workflow():
    with TestClient(app) as c:
        assert c.get('/api/health').status_code==200
        wards=c.get('/api/wards').json();assert len(wards)>=3
        assert c.post('/api/alerts',json={'ward_id':1,'message':'Test warning','severity':'high'}).status_code==403
        headers={'x-officer-key':'test-key'}
        alert=c.post('/api/alerts',json={'ward_id':1,'message':'Test warning','severity':'high'},headers=headers);assert alert.status_code==201
        assert len(c.get('/api/alerts?ward_id=1').json())==1
        assert len(c.get('/api/alerts?ward_id=2').json())==0
        incident=c.post('/api/incidents',json={'ward_id':1,'kind':'waterlogging','description':'Test incident'});assert incident.status_code==201
        rescue=c.post('/api/rescue-requests',json={'lat':19.072,'lon':72.879,'required_skill':'rescue'});assert rescue.status_code==201
        rid=rescue.json()['id'];matches=c.get(f'/api/rescue-requests/{rid}/matches').json();assert matches
        assigned=c.post(f'/api/rescue-requests/{rid}/assign',json={'volunteer_id':matches[0]['volunteer_id']},headers=headers);assert assigned.status_code==200
        assert c.post(f'/api/rescue-requests/{rid}/assign',json={'volunteer_id':matches[0]['volunteer_id']},headers=headers).status_code==409
        assert c.post('/api/shelter-allocations',json={'shelter_id':2,'people':3},headers=headers).status_code==409
        assert c.post('/api/shelter-allocations',json={'shelter_id':1,'people':2},headers=headers).status_code==201
        rumour=c.post('/api/rumours',json={'claim':'Bridge closed due to flooding'});assert rumour.status_code==201
        review=c.patch(f"/api/rumours/{rumour.json()['id']}",json={'status':'inconclusive','reviewer_note':'No verified evidence yet'},headers=headers);assert review.status_code==200
