function BlueInitWebGL(canvas){
	if (!window.WebGLRenderingContext){
     alert("Your browser does not support WebGL. See http://get.webgl.org");
     return;
  }
	if(!canvas)		console.log('Failed to find canvas!');

	try { gl = canvas.getContext("experimental-webgl");
   } catch(e) {}
  if ( !gl ) {alert("Can't get WebGL"); return;}

	var c_w = canvas.width,  c_h = canvas.width;
	gl.viewport(0, 0, c_w, c_h);

	gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearDepth(1.0);

  return gl;
}

function getShader(gl, str, shader_type){ 
   var shader = gl.createShader ( eval(shader_type) );
   gl.shaderSource(shader, str);
   gl.compileShader(shader);
   if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
      alert(gl.getShaderInfoLog(shader));
   return shader;
}

function BlueInitProg(gl, VSHADER_SOURCE, FSHADER_SOURCE){
	var program  = gl.createProgram();
	gl.attachShader(program, getShader( gl, VSHADER_SOURCE, 'gl.VERTEX_SHADER'));
  gl.attachShader(program, getShader( gl, FSHADER_SOURCE, 'gl.FRAGMENT_SHADER'));
  gl.linkProgram(program);
  return program;
}

function BlueInitAttrib(program,Id,a_Position,a_Color,a_Norm,a_TexCoord,u_moveMat,u_proMat,u_difCol,u_specCol){
	a_Position[Id]  = gl.getAttribLocation(program[Id], 'a_Position');
	a_Color[Id]     = gl.getAttribLocation(program[Id], 'a_Color');
	a_Norm[Id]      = gl.getAttribLocation(program[Id], 'a_Norm');
	a_TexCoord[Id]  = gl.getAttribLocation(program[Id], 'a_TexCoord');
	u_moveMat[Id]   = gl.getUniformLocation(program[Id],"u_moveMat");
	u_proMat[Id]    = gl.getUniformLocation(program[Id],"u_proMat");
	u_difCol[Id]    = gl.getUniformLocation(program[Id],"u_difCol");
  u_specCol[Id]   = gl.getUniformLocation(program[Id],"u_specCol");
}

function DataCheck(Name){
	var DATA_Name = 'DATA.' + Name;	var str = "";
	if(!eval(DATA_Name))	console.log('No ' + Name + ' found in Data.json!');
	else str = Name + '=' + DATA_Name + ';';
	return str;
}

function DataExist(Name){
	var DATA_Name = 'DATA.' + Name;	var str="";
	if(!eval(DATA_Name))	console.log('No ' + Name + ' found in Data.json!');
	else str = 'Exist["' + Name + '"]=1;';
	return str;
}

function BlueReadJson(){
	if (!document.getElementById('ModelDATA')){
		console.log('No Data.json found in HTML');
		return;
	}
	var str = '';
	str += DataCheck('NODES_PER_ELE');
	str += DataCheck('VALUES_PER_NOD');
	str += DataCheck('MODEL_CENTER');
	str += DataExist('v');
	str += DataExist('f');
	str += DataExist('nr');
	str += DataExist('val');
	str += DataExist('VALMAX');
	str += DataExist('VALMIN');
	console.log(str);
	return str;
}

function Normalize(tri){
	var v0x = tri[0];		var v0y = tri[1];		var v0z = tri[2];
	var v1x = tri[3];		var v1y = tri[4];		var v1z = tri[5];
	var v2x = tri[6];		var v2y = tri[7];		var v2z = tri[8];

	var ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
	var bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;
	var nx = ay*bz - az*by,  ny = -ax*bz + az*bx,  nz = ax*by - ay*bx;
	var no = Math.sqrt(nx*nx + ny*ny + nz*nz);
	var n = [nx/no, ny/no, nz/no];
	
	return n;
}

function DetermineProgID(TypeOfProg, TypeName, program){
	for (var i=0;i<TypeOfProg.length;i++){
		if (TypeOfProg[i]==TypeName){			
			return i;
		}
	}	
}

function BlueModelGeneration(){	
	var v = new Float32Array(DATA.v);	var VSIZE = v.BYTES_PER_ELEMENT;
	var f = new Uint16Array (DATA.f);	var nf = f.length;
	var val = new Float32Array(DATA.val);
	var VPN = DATA.VALUES_PER_NOD;
	var VALMAX = DATA.VALMAX, VALMIN = DATA.VALMIN;

	var pt = new Float32Array(nf*3);
	var nr = new Float32Array(nf*3);
	var cs = new Float32Array(nf*VALUES_PER_NOD);
	var ccs = new Float32Array(3*cs.length);	// 顶点颜色X3 (R,G,B)
	var t = s = r = c = 0;

 	for(var k = 0; k < nf; k += NODES_PER_ELE){	//逐个单元创建拓扑
 		for(var i=0;i<NODES_PER_ELE;i++){
 			var node = f[k + i];	// 获得结点号
 			for (var j=0;j<VALUES_PER_NOD;j++)
 				cs[s++] = val[node*VALUES_PER_NOD+j];	// 结点变量值
 			for(var j=0;j<3;j++)
 				pt[t++] = v[node*3 + j];
 		}
 	}
 	for(var i=0;i<pt.length;i++){ // 逐个单元求法向量
 		var xyz = new Array(9);
 		for(var j=0;j<9;j++)	xyz[j] = pt[i*9+j];
 		var n = Normalize(xyz);
 		for(var j=0;j<9;j++)	nr[r++] = n[j%3];
 	}
	for(var i=0;i<cs.length;i++){	// 逐个结点求RGB
		var rgb = rgb_legend(cs[i], VALMIN[i%VPN], VALMAX[i%VPN]);
		ccs[c++]=rgb[0];		ccs[c++]=rgb[1];		ccs[c++]=rgb[2];
	}
	return {
		Num : nf,
		XYZ : pt,
		Norm: nr,
		RGB : ccs
	};
}

function BlueModelBuffer(gl, ProgID, xyz, norm, rgb, a_Position, a_Norm, a_Color, VSIZE){
	var VALMAX = DATA.VALMAX[ProgID], VALMIN = DATA.VALMIN[ProgID];
	var NODES_PER_ELE  = DATA.NODES_PER_ELE;
	var VALUES_PER_NOD = DATA.VALUES_PER_NOD;

	vertexBuffer = PushBuffer(gl, xyz);	// 顶点坐标缓冲区
	gl.vertexAttribPointer(a_Position[ProgID], 3, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_Position[ProgID]);
	//gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, VSIZE*3, 0);
	//gl.enableVertexAttribArray(a_TexCoord);

	normalBuffer = PushBuffer(gl, norm);	// 顶点法向量缓冲区
	gl.vertexAttribPointer(a_Norm[ProgID], 3, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_Norm[ProgID]);

	colorBuffer = PushBuffer(gl, rgb);		// 顶点颜色缓冲区
	gl.vertexAttribPointer(a_Color[ProgID], 3, gl.FLOAT, false, VSIZE*VALUES_PER_NOD*3, VSIZE*ProgID*3);
	gl.enableVertexAttribArray(a_Color[ProgID]);

	// 色标上下限
	document.getElementById('TopValue').innerHTML=VALMAX;
	document.getElementById('BotValue').innerHTML=VALMIN;
}

function PushBuffer(gl, Data){
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, Data, gl.STATIC_DRAW);	// 推送pt进缓冲区,注意类型!
	return buffer;
}

function rgb_legend(xx, bot, up){
	var f = (xx-bot)/(up-bot);
	var a = (1-f)/0.25;
	var x =  Math.floor(a);
	var y = a - x;
	var rgb = [0., 0., 0.];
	switch(x){
		case 0: rgb=[  1,  y,  0];break;
		case 1: rgb=[1-y,  1,  0];break;
		case 2: rgb=[  0,  1,  y];break;
		case 3: rgb=[  0,1-y,  1];break;
		case 4: rgb=[  0,  0,  1];break;
	}
	return rgb;
}

function Ready4Model(gl, ProgID, proMat, rotMat, transl, MODEL_CENTER, u_proMat, u_moveMat){
	var moveMat = new CanvasMatrix4();
	moveMat.makeIdentity();
	moveMat.translate(-MODEL_CENTER[0], -MODEL_CENTER[1], -MODEL_CENTER[2]);	// 模型中间位置
  moveMat.multRight(rotMat);
 	moveMat.translate(0, 0, transl);

	gl.uniformMatrix4fv(u_proMat[ProgID], false, proMat.getAsArray());
  gl.uniformMatrix4fv(u_moveMat[ProgID], false, moveMat.getAsArray());

  gl.clearColor(42/256, 62/256, 86/256, 1.0);	// Background Color
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function BlueEnableProg(Id, program, u_difCol, backRGB, a_Position, a_Norm, a_Color){	
	var R=backRGB[0], G=backRGB[1], B=backRGB[2];
	gl.uniform3f(u_difCol[Id], R, G, B);
	gl.enableVertexAttribArray(a_Position[Id]);
	gl.enableVertexAttribArray(a_Norm[Id]);
	gl.enableVertexAttribArray(a_Color[Id]);
}

function drawPart(gl, n, shape){
	if(shape=='TRIANGLE_FAN'){
		for (var i=0;i<n/4;i++){
			gl.drawArrays(gl.TRIANGLE_FAN, i*4, 4);
		}
	}
	if(shape=='TRIANGLES')	gl.drawArrays(gl.TRIANGLES, 0, n);
}

function Tri2Line(OldArray){
	var num = OldArray.length;
	var NewArray = new Float32Array(num*2);	
	for(var i=0;i<num/9;i++){
		var j = i*18;	var k = i*9;
		NewArray[j]   = OldArray[k];		NewArray[j+1] = OldArray[k+1];		NewArray[j+2] = OldArray[k+2];
		NewArray[j+3] = OldArray[k+3];	NewArray[j+4] = OldArray[k+4];		NewArray[j+5] = OldArray[k+5];
		NewArray[j+6] = OldArray[k+3];	NewArray[j+7] = OldArray[k+4];		NewArray[j+8] = OldArray[k+5];
		NewArray[j+9] = OldArray[k+6];	NewArray[j+10] = OldArray[k+7];		NewArray[j+11] = OldArray[k+8];
		NewArray[j+12] = OldArray[k+6];	NewArray[j+13] = OldArray[k+7];		NewArray[j+14] = OldArray[k+8];
		NewArray[j+15] = OldArray[k];		NewArray[j+16] = OldArray[k+1];		NewArray[j+17] = OldArray[k+2];
	}
	return NewArray;
}

function ExtractColumn(rgb, VALUES_PER_NOD, ColID){
	var num = (rgb.length)/VALUES_PER_NOD/3;
	var NewRgb = new Float32Array(num*3);
	for(var i=0; i<num; i++){
		for(var j=0; j<3; j++){
			NewRgb[i*3+j] = rgb[i*3*VALUES_PER_NOD + ColID*3 + j];
		}
	}
	return NewRgb;
}

function BlueMeshGeneration(xyz, norm, rgb){
	PointNEW = Tri2Line(xyz);
	NormNEW  = Tri2Line(norm);
	NewRGB   = ExtractColumn(rgb, DATA.VALUES_PER_NOD, 0);	
	ValueNEW = Tri2Line(NewRGB);

	return {
		Num : PointNEW.length/3,
		XYZ : PointNEW,
		Norm: NormNEW,
		RGB : ValueNEW
	};
}

function BlueMeshBuffer(gl, ProgID, xyz, norm, rgb, a_Position, a_Norm, a_Color, VSIZE){
	// 顶点坐标缓冲区
	vBuffer = PushBuffer(gl, xyz);
	gl.vertexAttribPointer(a_Position[ProgID], 3, gl.FLOAT, false, VSIZE*3, 0);	
	gl.enableVertexAttribArray(a_Position[ProgID]);

	// 顶点法向量缓冲区
	nBuffer = PushBuffer(gl, norm);
	gl.vertexAttribPointer(a_Norm[ProgID], 3, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_Norm[ProgID]);
	
	// 顶点颜色缓冲区
	cBuffer = PushBuffer(gl, rgb);
	gl.vertexAttribPointer(a_Color[ProgID], 3, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_Color[ProgID]);
}

function drawLine(gl, n, shape){
	if(shape=='LINE_STRIP'){		
		gl.drawArrays(gl.LINE_STRIP,0,n);
	}else if(shape=='LINES'){
		gl.drawArrays(gl.LINES, 0, n);
	}
}

function BlueEventKeyboard(ev, Show){
	var Tx=0, Ty=0, Tz=0, Rx=0, Ry=0, Rz=0, M=0, P=0, delta_step = 0.1, angle_step =0.1, near = 0.0;
	var cmd = '';
	console.log('Keyboard Event!');
	switch(ev.keyCode){
		case 37:	Tx = -delta_step;	break;
		case 38:	Ty =  delta_step;	break;
		case 39:	Tx =  delta_step;	break;
		case 40:	Ty = -delta_step;	break;
		case 90:  Tz = -delta_step;	break;	// z
		case 88:	Tz =  delta_step;	break;  // x
		case 65:	Ry =  angle_step;	break;	// a
		case 68:  Ry = -angle_step;	break;	// d
		case 87:  Rx =  angle_step;	break;	// w
		case 83:	Rx = -angle_step;	break;	// s
		case 81:	Rz =  angle_step;	break;	// q
		case 69:  Rz = -angle_step;	break;	// e
		case 77:  M  = -1;					break;	// m
		case 80:  P  = -1;					break;	// p
	}
	if((Tx+Ty+Tz)!=0){
		cmd += 'rotMat.translate(' + Tx + ',' + Ty + ',' + Tz + ');';	// define a translation matrix by passed translation values on the right
	}
	if((Rx+Ry+Rz)!=0){
		cmd += 'rotMat.rotate(1,' + Rx + ',' + Ry + ',' + Rz + ');';// define a rotate matrix by passed rotation values on the right (angle is in degrees)
	}
	if(M!=0){
		Show['mesh'] *= M;
		if(Show['mesh']==1){
			Show['model'] = -1;
			Show['material'] = -1;
		}else{
			Show['model'] = 1;
			Show['material'] = -1;
		}
	}
	if(P!=0){
		Show['material'] *= P;
		if(Show['material']==1){
			Show['model'] = -1;
			Show['mesh'] = -1;
		}else{
			Show['model'] = 1;
			Show['mesh'] = -1;
		}
	}
	return cmd;
}

function drawModel(gl,n,NODES_PER_ELE,str){
	if (str!='mesh'){
		if (NODES_PER_ELE==3)
			drawPart(gl, n, 'TRIANGLES');
		else if(NODES_PER_ELE==4)
			drawPart(gl, n, 'TRIANGLE_FAN');
	}else{
		drawLine(gl, n, 'LINES');
	}
}