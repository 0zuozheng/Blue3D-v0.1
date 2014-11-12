var VSHADER_SOURCE  =
	'uniform mat4 u_proMat;\n' +
	'uniform mat4 u_moveMat;\n' +
	'attribute vec3 a_Norm;\n' +
	'attribute vec4 a_Position;\n' + 
	'attribute vec4 a_Color;\n' + 
	'attribute vec2 a_TexCoord;\n' + 
	'varying vec2 v_TexCoord;\n' +
	'varying vec3 v_col;\n' +
	'varying vec4 v_Normal;\n' +
	'void main() {\n' +
	' gl_Position  = u_proMat * u_moveMat* a_Position;\n' +	// Coordinates
	' v_Normal = u_moveMat * vec4(a_Norm, .0);\n' +
	' v_col = vec3(a_Color);\n' +
	' v_TexCoord = a_TexCoord/10.0;\n' +
	'}\n';

var FSHADER_SOURCE = 
	'precision mediump float;\n' +
	'const vec4 c_dirDif = vec4(0.09, 0.59, 0.80, 1.);\n' +
  'const vec4 c_dirHalf = vec4(.259, .4034, .8776, 0.);\n' +	
	'uniform vec3 u_difCol;\n' +
  'uniform vec3 u_specCol;\n' +
  'uniform sampler2D u_Sampler;\n' +
	'varying vec2 v_TexCoord;\n' +  
	'varying vec3 v_col;\n' +
	'varying vec4 v_Normal;\n' +
	'void main() {\n' +
	' vec3 diffuse = u_difCol * v_col * abs(dot(v_Normal, c_dirDif));\n' +
//	' vec3 diffuse = u_difCol * v_col * max( 0., dot(v_Normal, c_dirDif) );\n' +  // 关闭内部面渲染
//  ' vec3 spec = 1.* u_specCol * pow( max( 0., dot(v_Normal, c_dirHalf) ), 40.);\n' +	// 打开镜面反射
	' gl_FragColor = vec4( diffuse, 1.);\n' +		// Color
//	' gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
	'}\n';

function webGL_main(){
	var canvas = document.getElementById('example');
	var gl = BlueInitWebGL(canvas);

	var a_Position = new Array(3); 	var a_Color    = new Array(3);
	var a_Norm     = new Array(3); 	var a_TexCoord = new Array(3);
	var u_moveMat  = new Array(3); 	var u_proMat   = new Array(3);
	var u_difCol   = new Array(3); 	var u_specCol  = new Array(3);

	var program = new Array();	var TypeOfProg = new Array();
	program[0] = BlueInitProg(gl,VSHADER_SOURCE,FSHADER_SOURCE);	TypeOfProg[0] = 'model';
	program[1] = BlueInitProg(gl,VSHADER_SOURCE,FSHADER_SOURCE);	TypeOfProg[1] = 'material';
	program[2] = BlueInitProg(gl,VSHADER_SOURCE,FSHADER_SOURCE);	TypeOfProg[2] = 'mesh';

	BlueInitAttrib(program,0,a_Position,a_Color,a_Norm,a_TexCoord,u_moveMat,u_proMat,u_difCol,u_specCol);
	BlueInitAttrib(program,1,a_Position,a_Color,a_Norm,a_TexCoord,u_moveMat,u_proMat,u_difCol,u_specCol);
	BlueInitAttrib(program,2,a_Position,a_Color,a_Norm,a_TexCoord,u_moveMat,u_proMat,u_difCol,u_specCol);

	var proMat = new CanvasMatrix4();		proMat.perspective(45, canvas.width/canvas.height, .1, 1000);
	var rotMat = new CanvasMatrix4();		rotMat.makeIdentity();
	var transl = -50;
	var Background = [0.3,0.7,1.0];

	var Current = new Array();	var Show = new Array();		var Exist = new Array();
	Current['mesh']= 0;					Show['mesh'] = -1;      	Exist['mesh']= 0;
	Current['material'] = 0;  	Show['material'] = -1;    Exist['material'] = 0;
	Current['model'] = 0;     	Show['model'] = 1;        Exist['model'] = 0;

	eval(BlueReadJson());

	var SIZEofV = new Float32Array(1);	var VSIZE = SIZEofV.BYTES_PER_ELEMENT;

	var RETURN = BlueModelGeneration();			var RETURN_MESH;
	Num = RETURN['Num'];			XYZ = RETURN['XYZ'];
	Norm = RETURN['Norm'];		RGB = RETURN['RGB'];

	drawScene();
	function drawScene(){
		if(Show['model']==1){
			if(!Current['model']) ProgID = PrepareBuffer('model', XYZ, Norm, RGB);
			draw(ProgID,Num);
		}
		if(Show['material']==1){			
			if(!Current['material']) ProgID = PrepareBuffer('material', XYZ, Norm, RGB);
			draw(ProgID,Num);
		}
		if(Show['mesh']==1){
			if(!Exist['mesh']){
				console.log('MESH GENERATION!');
				RETURN_MESH = BlueMeshGeneration(XYZ, Norm, RGB);
				Exist['mesh'] = 1;
			}
			if(!Current['mesh']) ProgID = PrepareBuffer('mesh', RETURN_MESH['XYZ'], RETURN_MESH['Norm'], RETURN_MESH['RGB']);
			draw(ProgID,RETURN_MESH['Num']);
		}
    gl.flush ();
	}
	
	function PrepareBuffer(str, xyz, norm, rgb){
		ProgID = DetermineProgID(TypeOfProg, str, program);
		gl.useProgram(program[ProgID]);
		BlueEnableProg(ProgID, program, u_difCol, Background, a_Position, a_Norm, a_Color);
		if(str=='mesh')	BlueMeshBuffer (gl, ProgID, xyz, norm, rgb, a_Position, a_Norm, a_Color, VSIZE);
		else						BlueModelBuffer(gl, ProgID, xyz, norm, rgb, a_Position, a_Norm, a_Color, VSIZE);
		for(var p in Current){
			if(p==str)		Current[p] = 1;
			else 					Current[p] = 0;
		}
		return ProgID;
	}
	
	function draw(ProgID, n){
		gl.useProgram(program[ProgID]);
		Ready4Model(gl, ProgID, proMat, rotMat, transl, MODEL_CENTER, u_proMat, u_moveMat);
		str = TypeOfProg[ProgID];
		drawModel(gl, n, NODES_PER_ELE, str);
	}

	/* 键盘事件 */
	document.onkeydown = function(ev){
		eval(BlueEventKeyboard(ev, Show));
		drawScene();
	}

	/* 鼠标事件 */
	var xOffs, yOffs, drag=0;
	canvas.onmousedown = function ( ev ){
     drag  = 1;
     xOffs = ev.clientX;  yOffs = ev.clientY;
  }
  canvas.onmouseup = function ( ev ){
     drag  = 0;
     xOffs = ev.clientX;  yOffs = ev.clientY;
  }
  canvas.onmousemove = function ( ev ){
     var xRot, yRot;
     if ( drag == 0 ) return;
     if ( ev.shiftKey ) {
        transl *= 1 + (ev.clientY - yOffs)/1000;
        yRot = - xOffs + ev.clientX; }
     else {
        yRot = - xOffs + ev.clientX;  
        xRot = - yOffs + ev.clientY; 
     }
     xOffs = ev.clientX;  yOffs = ev.clientY;
     rotMat.rotate(xRot/5, 1,0,0);  rotMat.rotate(yRot/5, 0,1,0);
     drawScene();
  }

	/* 滚轮事件 */
	var wheelHandler = function(ev) {
    var del = 1.1;
		if (ev.shiftKey) del = 1.01;
		var ds = ((ev.detail || ev.wheelDelta) > 0) ? del : (1 / del);
		transl *= ds;
		document.getElementById('WheelValue').innerHTML= '滚轮距离 :' + transl;
    drawScene();
		ev.preventDefault();       
  };  
  canvas.addEventListener('DOMMouseScroll', wheelHandler, false);
  canvas.addEventListener('mousewheel', wheelHandler, false);
}

function initTextures(gl,program,n){
	var texture = gl.createTexture();
	
	var u_Sampler = gl.getUniformLocation(program, 'u_Sampler');
	
	var image = new Image();
	
	image.src = 'text.jpg'
		
	//var image = document.getElementById('myTexture');
	
	loadTexture(gl,n, texture, u_Sampler, image);
	
	return true;
}

function loadTexture(gl,n,texture,u_Sampler, image){
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
	
	gl.uniform1i(u_Sampler, 0);	
}