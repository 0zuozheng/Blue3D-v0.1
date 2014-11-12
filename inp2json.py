import sys
from odbAccess import *
from abaqusConstants import *
from string import *

inp = open('mesh.inp','r')
json = open('Data.json','w')

Reading_nodes = 0
Reading_elems = 0
FACE6 = [[3,2,1,0],
        [4,5,6,7],
        [4,0,1,5],
        [5,1,2,6],
        [6,2,3,7],
        [7,3,0,4]]
FACE5 = [[2,1,0],
         [3,4,5],
         [0,1,4,3],
         [1,2,5,4],
         [0,3,5,2]]
Tri_of_Quad =[[0, 1, 2],
              [2, 3, 0]]


coords = []
lists = []
faces8 = []

#########################################################
def ExtractFaces(Reading_elems, s, lists):
    n = []
    for i in range(len(s)-1):
        n.append(atoi(s[i+1]))
    str_FACE = 'FACE' + str(Reading_elems)

    for i in (eval(str_FACE)):
        x = [[],[]]
        for j in i:
            x[0].append(n[j])
            x[1].append(n[j])
        lists.append(x)
#########################################################
def Faces2json(face, json):
    if (len(face)==3):
        for j in range(3):
           json.write('%d,' % (v[1][j] - 1))  # node id - 1
        json.write('\n')
    elif(len(face)==4):
        for j in range(2):
            for k in range(3):
                json.write('%d,' % (face[Tri_of_Quad[j][k]] - 1))   # node id - 1
        json.write('\n')
#########################################################
def odbRead(odb, json):    
    assembly = odb.rootAssembly
    lists = []
    iFrame = odb.steps['Step-1'].frames[-1]
        
    json.write('"val":[')
    V = iFrame.fieldOutputs['NT11']
        
    for v in V.values:
        json.write('%.2f,\n' % (v.data))
        lists.append(v.data)

    json.write('],\n')
    json.write('"VALMAX":[%.2f],\n' % (max(lists)))
    json.write('"VALMIN":[%.2f],\n' % (min(lists)))
#########################################################

        
json.write('var DATA= {\n')
json.write('"NODES_PER_ELE"  : 3,\n')
json.write('"VALUES_PER_NOD" : 1,\n')

for line in inp.readlines():
    s = line.split(',')
    if(s[0][0]=='*'):   #keyword
        s[0]=s[0].strip('\n')
        print s[0].lower()
        if (s[0].lower()=='*node'):
            Reading_nodes = 1
            json.write('"v":[')
        else:
            if(Reading_nodes):
                json.write('],\n')
            Reading_nodes=0
        if (s[0].lower()=='*element'):
            s[1]=s[1].strip('\n')
            if(s[1][-1]=='8'):
                Reading_elems = 6  # number of face
            elif(s[1][-1]=='6'):
                Reading_elems = 5  # number of face
            else:
                Reading_elems = 0
        else:
            Reading_elems = 0
    else:  #data block
        if(Reading_nodes):
            coords.append([])
            for i in range(len(s)-1):
                f = atof(s[i+1])/2
                coords[-1].append(f)
                json.write('%.3f,' % (f))
            json.write('\n')
        if(Reading_elems):
            ExtractFaces(Reading_elems, s, lists)

x = 0.0
y = 0.0
z = 0.0
for i in range(len(coords)):
    x += coords[i][0]
    y += coords[i][1]
    z += coords[i][2]
avg_x = x/len(coords)
avg_y = y/len(coords)
avg_z = z/len(coords)

json.write('"MODEL_CENTER":[%.2f,%.2f,%.2f],\n' % (avg_x,avg_y,avg_z))

for k, v in enumerate(lists):
    v[0].sort()
lists.sort(key=lambda x:x[0])

inside = [0 for i in range(len(lists))]
for k, v in enumerate(lists):
    if(k!=len(lists)-1):
        if (v[0]==lists[k+1][0]):
            inside[k]   = 1
            inside[k+1] = 1

json.write('"f":[')
for k, v in enumerate(lists):
    if (inside[k]==0):
        Faces2json(v[1], json)
json.write('],\n')

odb = openOdb(path='job-1.odb')
if(odb):
    odbRead(odb, json)

json.write('}')
json.close()

#########################################################


##FACE8 = [[1,2,3,4],
##        [8,5,6,7],
##        [5,1,2,6],
##        [6,2,3,7],
##        [7,3,4,8],
##        [8,4,1,5]]
##FACE6 = [[3,2,1],
##         [4,5,6],
##         [1,2,5,4],
##         [2,3,6,5],
##         [1,4,6,3]]
