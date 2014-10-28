function BlueInitWebGL(canvas){
	if (!window.WebGLRenderingContext){
     alert("Your browser does not support WebGL. See http://get.webgl.org");
     return;
  }
	if(!canvas){
		console.log('Failed to find canvas!');
	}
	
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

function BlueInitProg(gl, VSHADER_SOUIRCE, FSHADER_SOUIRCE){
	var program  = gl.createProgram();
	gl.attachShader(program, getShader( gl, VSHADER_SOUIRCE, 'gl.VERTEX_SHADER'));
  gl.attachShader(program, getShader( gl, FSHADER_SOUIRCE, 'gl.FRAGMENT_SHADER'));
  gl.linkProgram(program);	gl.useProgram(program);
  return program;
}

function BlueReadJson(){
	if (!document.getElementById('ModelDATA')){
		console.log('No Data.json found in HTML');
		return;
	}
	var str = '';
	if(!DATA.NODES_PER_ELE)		console.log('No NODES_PER_ELE found in .Json');
	else str += 'NODES_PER_ELE = DATA.NODES_PER_ELE;';
	if(!DATA.VALUES_PER_NOD)	console.log('No NODES_PER_ELE found in .Json');
	else str += 'VALUES_PER_NOD = DATA.VALUES_PER_NOD;';
	if(!DATA.MODEL_CENTER)		console.log('No NODES_PER_ELE found in .Json');
	else str += 'var MODEL_CENTER   = DATA.MODEL_CENTER;';
	if(!DATA.v)		console.log('No v found in .Json');
	else{
		 str += 'Exist["v"] = 1;';
		 str += 'var LENGTH_of_v = DATA.v.length;';
	}
	if(!DATA.nr)		console.log('No nr found in .Json');
	else str += 'Exist["nr"] = 1;';
	if(!DATA.f)		console.log('No f found in .Json');
	else str += 'Exist["f"] = 1;';
	if(!DATA.val)		console.log('No val found in .Json');
	else str += 'Exist["val"] = 1;val=DATA.val;'
	if(!DATA.VALMAX)		console.log('No VALMAX found in .Json');
	else str += 'VALMAX = DATA.VALMAX;'
	if(!DATA.VALMIN)		console.log('No VALMIN found in .Json');
	else str += 'VALMIN = DATA.VALMIN;'
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

function BlueNormalization(gl, val, a_Position, a_Norm, a_Color, a_TexCoord){
	var VALMAX = DATA.VALMAX;
	var VALMIN = DATA.VALMIN;
	var NODES_PER_ELE  = DATA.NODES_PER_ELE
	var VALUES_PER_NOD = DATA.VALUES_PER_NOD
	var v = new Float32Array(DATA.v);	var nv = v.length/3;	var VSIZE = v.BYTES_PER_ELEMENT;
	var f = new Uint16Array (DATA.f);	var nf = f.length;		var FSIZE = f.BYTES_PER_ELEMENT;

	var pt = new Float32Array(nf*3);
	var nr = new Float32Array(nf*3);
	var cs = new Float32Array(nf*VALUES_PER_NOD);
	var vv = new Float32Array(NODES_PER_ELE*3);
	var t = s = r = 0;		

 	for(var k = 0; k < nf; k += NODES_PER_ELE){	//逐个单元循环
 		for(var i=0;i<NODES_PER_ELE;i++){
 			var node = f[k + i];	// 获得结点号
 			for (var j=0;j<VALUES_PER_NOD;j++){
 				cs[s++] = val[node*VALUES_PER_NOD+j];	// 结点变量值
 			}
 			for(var j=0;j<3;j++){
 				vv[i*3+j] = v[node*3 + j];	// 结点坐标值
 				pt[t++] = vv[i*3+j]; 		
 			}
 		}
 		var n = Normalize(vv);

		for(var i=0;i<NODES_PER_ELE;i++){
			nr[r++] = n[0];
			nr[r++] = n[1];
			nr[r++] = n[2];
		}
	}

	var ccs = initVertexBuffers(gl, pt, nr, cs, a_Position, a_Norm, a_Color, a_TexCoord, VSIZE, VALUES_PER_NOD, VALMAX, VALMIN);

	return {
		PointNum : nf,
		PointXYZ : pt,
		PointNorm: nr,
		ValueRGB : ccs
	};
}

function PushBuffer(gl, Data){
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);	
	gl.bufferData(gl.ARRAY_BUFFER, Data, gl.STATIC_DRAW);	// 推送pt进缓冲区,注意类型！
	return buffer;
}

function initVertexBuffers(gl, pt, nr, cs, a_Position, a_Norm, a_Color, a_TexCoord, VSIZE, VALUES_PER_NOD, VALMAX, VALMIN){
	// 顶点坐标缓冲区
	vertexBuffer = PushBuffer(gl, pt);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, VSIZE*3, 0);	
	gl.enableVertexAttribArray(a_Position);	
	gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_TexCoord);

	// 顶点法向量缓冲区
	normalBuffer = PushBuffer(gl, nr);
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.vertexAttribPointer(a_Norm, 3, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_Norm);
	
	// 顶点颜色缓冲区
	var ccs = new Float32Array(3*cs.length);
	for(var i=0;i<cs.length;i++){
		var rgb = rgb_legend(cs[i], VALMIN, VALMAX);
		ccs[i*3]  =rgb[0];
		ccs[i*3+1]=rgb[1];
		ccs[i*3+2]=rgb[2];
	}//cs待销毁
	
	var DrawID = 0;
	Ready4Color(gl, ccs, a_Color, DrawID, VSIZE, VALUES_PER_NOD);
	return ccs;
}

function Ready4Color(gl, ccs, a_Color, DrawID, VSIZE, VALUES_PER_NOD){	
	colorBuffer = PushBuffer(gl, ccs);
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, VSIZE*VALUES_PER_NOD*3, 0*3);
	gl.enableVertexAttribArray(a_Color);
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

function Ready4Model(gl, proMat, rotMat, transl, MODEL_CENTER, u_proMat, u_moveMat){
	var moveMat = new CanvasMatrix4();
	moveMat.makeIdentity();
	moveMat.translate(-MODEL_CENTER[0], -MODEL_CENTER[1], -MODEL_CENTER[2]);	// 模型中间位置
  moveMat.multRight(rotMat);
 	moveMat.translate(0, 0, transl);

	gl.uniformMatrix4fv(u_proMat, false, proMat.getAsArray());
  gl.uniformMatrix4fv(u_moveMat, false, moveMat.getAsArray());
	
  gl.clearColor(42/256, 62/256, 86/256, 1.0);	// Background Color
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);		
}

function drawPart(gl, n, shape){
	//gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
	if(shape=='TRIANGLE_FAN'){
		for (var i=0;i<n/4;i++){
			gl.drawArrays(gl.TRIANGLE_FAN, i*4, 4);
		}
	}
	if(shape=='TRIANGLES')	gl.drawArrays(gl.TRIANGLES, 0, n);
}

function Tri2Line(OldArray){
	var num = OldArray.length;
	var NewArray = new Float32Array(num*7/3);
	for (var i=0;i<num;i++)	NewArray[i] = OldArray[i];
	for(var i=0;i<num/9;i++){
		var j = num + i*12;	var k = i*9;
		NewArray[j]   = OldArray[k];		NewArray[j+1] = OldArray[k+1];		NewArray[j+2] = OldArray[k+2];
		NewArray[j+3] = OldArray[k+3];	NewArray[j+4] = OldArray[k+4];		NewArray[j+5] = OldArray[k+5];
		NewArray[j+6] = OldArray[k+3];	NewArray[j+7] = OldArray[k+4];		NewArray[j+8] = OldArray[k+5];
		NewArray[j+9] = OldArray[k+6];	NewArray[j+10] = OldArray[k+7];		NewArray[j+11] = OldArray[k+8];
	}
	return NewArray;
}

function BlueMeshGeneration(gl, PointXYZ, PointNorm, ValueRGB, a_Position, a_Norm, a_Color){
	PointNEW = Tri2Line(PointXYZ);
	NormNEW  = Tri2Line(PointNorm);
	ValueNEW = Tri2Line(ValueRGB);

	var VSIZE = PointNEW.BYTES_PER_ELEMENT;
	// 顶点坐标缓冲区
	gl.disableVertexAttribArray(a_Position);
	vBuffer = PushBuffer(gl, PointNEW);
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, VSIZE*3, 0);	
	gl.enableVertexAttribArray(a_Position);
//	gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, VSIZE*3, 0);
//	gl.enableVertexAttribArray(a_TexCoord);

	// 顶点法向量缓冲区
	gl.disableVertexAttribArray(a_Norm);
	nBuffer = PushBuffer(gl, NormNEW);
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
	gl.vertexAttribPointer(a_Norm, 3, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_Norm);
	
	// 顶点颜色缓冲区
	gl.disableVertexAttribArray(a_Color);
	cBuffer = PushBuffer(gl, ValueNEW);
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, VSIZE*3, 0);
	gl.enableVertexAttribArray(a_Color);
	
	gl.drawArrays(gl.LINES, 0, 81906);
}

function BlueMesh(gl, NumOfNodes){
	var num = NumOfNodes*2/3;	// number of lines
	var nodes = new Uint16Array(num*2);	// number of line nodes.	

	for (var i=0;i<num/2;i++){
		var j = i*4;	var k = i*3;
		nodes[j  ] = k;		nodes[j+1] = k+1;
		nodes[j+2] = k+1;	nodes[j+3] = k+2;
	}
	
	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, nodes, gl.STATIC_DRAW);
	
	return nodes.length;
}

function drawLine(gl, n, shape){	
	if(shape=='LINE_STRIP'){
		//for (var i=0;i<n/3;i++){
			//gl.drawArrays(gl.LINE_STRIP,i*3,3);
		//}
		gl.drawArrays(gl.LINE_STRIP,0,n);
	}else if(shape=='LINES'){
		gl.drawElements(gl.LINES, n, gl.UNSIGNED_SHORT, 0);
	}
}

function BlueEventKeyboard(ev, tickID){
	var Tx=0.0, Ty=0.0, Tz=0.0, Rx=0.0, Ry=0.0, Rz=0.0, M=0, delta_step = 0.1, angle_step =0.1, near = 0.0;
	var cmd = '';
	console.log('Keyboard Event!');
	cancelAnimationFrame(tickID);
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
		case 77:  M  = -1;				break;	// m
/*		case 8 :  if(ev.shiftKey)	near = -0.01; // Shift
		  				else near = 0.01;// Backspace **注意 z轴向屏幕外为负！！！
		  				break;
		*/
	}
	if((Tx+Ty+Tz)!=0){
		cmd += 'rotMat.translate(' + Tx + ',' + Ty + ',' + Tz + ');';	// define a translation matrix by passed translation values on the right
	}
	if((Rx+Ry+Rz)!=0){
		cmd += 'rotMat.rotate(1,' + Rx + ',' + Ry + ',' + Rz + ');';// define a rotate matrix by passed rotation values on the right (angle is in degrees)
	}
	if(M!=0){
		cmd += "Show['Mesh']*=" + M +";";
	}
	
	/* if(near!=0.0){
		proMat.makeIdentity();
		g_near += near;
		proMat.ortho(-10, 10, -10, 10, g_near, 2);
		var nf = document.getElementById('nearFar');
		nf.innerHTML = 'near : ' + g_near;
	}*/
	
	return cmd;
}