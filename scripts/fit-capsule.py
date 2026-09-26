"""Fit on the 332×150 native 16× capture; never on holdouts.
Run with Python + NumPy + Pillow. Outputs a fixed normalized Bézier profile.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures'

def boundary(file, scale):
    im = np.asarray(Image.open(file).convert('RGB'))[:, :, 0].astype(float)
    points = []
    for y, row in enumerate(im[:im.shape[0]//2, :im.shape[1]//2]):
        hits = np.flatnonzero(row <= 127.5)
        if len(hits):
            x = hits[0]
            edge = 0 if x == 0 else x-.5+(row[x-1]-127.5)/(row[x-1]-row[x])
            points.append([edge/scale, (y+.5)/scale])
    for x, col in enumerate(im[:im.shape[0]//2, :im.shape[1]//2].T):
        hits = np.flatnonzero(col <= 127.5)
        if len(hits):
            y = hits[0]
            edge = 0 if y == 0 else y-.5+(col[y-1]-127.5)/(col[y-1]-col[y])
            points.append([(x+.5)/scale, edge/scale])
    return np.array(points)

angles = np.linspace(0, np.pi/2, 361)
normals = np.array([np.cos(angles), np.sin(angles)]).T

def supports(points):
    return np.min(points @ normals.T, axis=0)

# Nine adjustable values. Endpoints and axis tangents remain fixed; adjacent
# cubics share tangent directions. Control points must remain monotone.
def controls(p):
    u,a,b,c,d,theta,phi,l1,l2 = p
    start=np.array([0,.5]); first=np.array([a,b]); second=np.array([c,d]); end=np.array([.7643324732780457,0])
    one=np.array([start,[0,.5-u],[0,b+a*np.tan(theta)],first])
    two=np.array([first,first+l1*np.array([np.cos(theta),-np.sin(theta)]),second-l2*np.array([np.cos(phi),-np.sin(phi)]),second])
    three=np.array([second,[c+d/np.tan(phi),0],[.5442450046539307,0],end])
    return np.array([one,two,three])

t=np.linspace(0,1,257); basis=np.array([(1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3]).T

def curve(p):
    return np.concatenate([basis @ segment for segment in controls(p)])

def valid(p):
    if not (0.001 < p[0] < .12 and .5 < p[5] < 1.5 and .08 < p[6] < .9 and .01 < p[7] < .3 and .01 < p[8] < .3): return False
    cp=controls(p)
    return np.isfinite(cp).all() and (cp[:,:,0]>=0).all() and (cp[:,:,1]>=0).all() and (np.diff(cp[:,:,0],axis=1)>=-1e-12).all() and (np.diff(cp[:,:,1],axis=1)<=1e-12).all()

if __name__ == '__main__':
    target=supports(boundary(ROOT/'capsule-native-332-150.0-16x.png',16))/150
    p=np.array([.02,.0374557003379,.315746992826,.315746992826,.0374557003379,1.21,.36,.1376,.1376])
    assert valid(p)
    def residual(v): return supports(curve(v))-target
    # Small damped least-squares solve; no optimizer dependency or runtime fit.
    damping=1e-5
    for iteration in range(100):
        r=residual(p); J=np.column_stack([(residual(p+np.eye(9)[i]*1e-5)-r)/1e-5 for i in range(9)])
        step=np.linalg.solve(J.T@J+damping*np.eye(9),-J.T@r)
        accepted=False
        for factor in [1,.5,.25,.125,.0625]:
            candidate=p+step*factor
            if valid(candidate) and np.dot(residual(candidate),residual(candidate)) < np.dot(r,r):
                p=candidate;damping=max(1e-9,damping*.7);accepted=True;break
        if not accepted:damping*=10
        if np.linalg.norm(step)<1e-9:break
    cp=controls(p)
    assert valid(p)
    for i in [0,1]:
        incoming=cp[i,3]-cp[i,2]; outgoing=cp[i+1,1]-cp[i+1,0]
        assert abs(np.linalg.det(np.array([incoming,outgoing])))<1e-12
    result={'training':'capsule-native-332-150.0-16x.png','parameters':p.tolist(),'quarter':cp.tolist(),'trainingMaxSupportError':float(np.max(np.abs(residual(p)))*150),'trainingRmsSupportError':float(np.sqrt(np.mean(residual(p)**2))*150)}
    (ROOT/'capsule-fit-profile.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
