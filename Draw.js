var VSHADER_SOUIRCE  =
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

var FSHADER_SOUIRCE = 
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

	var program = BlueInitProg(gl,VSHADER_SOUIRCE,FSHADER_SOUIRCE);

	var a_Position  = gl.getAttribLocation(program, 'a_Position');
	var a_Color     = gl.getAttribLocation(program, 'a_Color');
	var a_Norm      = gl.getAttribLocation(program, 'a_Norm');
	var a_TexCoord  = gl.getAttribLocation(program, 'a_TexCoord');

	var u_moveMat   = gl.getUniformLocation(program,"u_moveMat");
	var u_proMat    = gl.getUniformLocation(program,"u_proMat");
	var u_difCol    = gl.getUniformLocation(program,"u_difCol");
  var u_specCol   = gl.getUniformLocation(program,"u_specCol");

	var proMat  = new CanvasMatrix4();		proMat.perspective(45, canvas.width/canvas.height, .1, 1000);
	var rotMat  = new CanvasMatrix4();		rotMat.makeIdentity();
	var transl = -50;

	var Exist = new Array();	var Show = new Array();		Show['Mesh']=-1;
	var initData = BlueReadJson();
	eval(initData);

	var SIZEofV = new Float32Array(1);	var VSIZE = SIZEofV.BYTES_PER_ELEMENT;
	if(!Exist["val"]){
		var val = new Float32Array(LENGTH_of_v/3);
		for(var i=0;i<val.length;i++)	val[i]=i/(val.length);
	}var n=0;
	if(!Exist["nr"])	var RETURN = BlueNormalization(gl, val, a_Position, a_Norm, a_Color, a_TexCoord);
	n = RETURN['PointNum'];	PointXYZ = RETURN['PointXYZ'];	PointNorm = RETURN['PointNorm'];	ValueRGB = RETURN['ValueRGB'];
	
	initTextures(gl,program,n);

	drawScene();
	function drawScene(){
		gl.uniform3f(u_difCol, 0.3, 0.7, 1 );
		Ready4Model(gl, proMat, rotMat, transl, MODEL_CENTER, u_proMat, u_moveMat);
		if(Show['Mesh']==-1){
			if (NODES_PER_ELE==3)
				drawPart(gl, n, 'TRIANGLES');
			else if(NODES_PER_ELE==4)
				drawPart(gl, n, 'TRIANGLE_FAN');
		}else if(Show['Mesh']==1){
			if(!Exist['Mesh']){
				console.log('MESH GENERATION!');
				Show['MeshNum'] = BlueMesh(gl, n);
				Exist['Mesh'] = 1;
			}
			drawLine(gl, Show['MeshNum'], 'LINES');
		}
    gl.flush ();
	}

	/* 自动旋转  */
	var currentAngle = 0.0;
	var tickID;
	var tick = function(){
		currentAngle = animate();
		rotMat.rotate(currentAngle, 1, 1, 1);
		drawScene(gl, n);
		tickID = requestAnimationFrame(tick);
	}
	//tick();

	/* 画布大小变化 
	canvas.resize = function (){
    c_w = window.innerWidth - 100;  c_h = window.innerHeight - 100;
    canvas.width = c_w;   canvas.height = c_h;
    gl.viewport(0, 0, c_w, c_h);
    viewMat.makeIdentity();
    //viewMat.perspective(45, c_w/c_h, .1, 100);
    drawScene(gl,n, viewMat, rotMat);
  }*/

	/* 键盘事件 */
	document.onkeydown = function(ev){
		eval(BlueEventKeyboard(ev, tickID));
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
		console.log('滚轮距离 :' + transl);
    drawScene();
		ev.preventDefault();       
  };  
  canvas.addEventListener('DOMMouseScroll', wheelHandler, false);
  canvas.addEventListener('mousewheel', wheelHandler, false);
}

var g_last = Date.now();
function animate(){
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;
	var Angle = (1*elapsed)/100;
	return Angle;
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

var g_points = [];
var g_colors = [];
function click(ev, gl, canvas, a_Position, a_PointSize,u_FragColor){
	var x = ev.clientX;
	var y = ev.clientY;
	var rect = ev.target.getBoundingClientRect();
	
	x = ((x-rect.left) - canvas.height/2)/(canvas.height/2);
	y = (canvas.width/2 - (y-rect.top))/(canvas.width/2);
	
	g_points.push([x,y]);
	g_colors.push([x,y,0.,1.]);
	gl.clear(gl.COLOR_BUFFER_BIT);	// Clear Canvas
	
	var len = g_points.length;
	for(var i=0; i<len; i++){
		var xy = g_points[i];
		var rgba = g_colors[i];
		gl.vertexAttrib4f(a_Position, xy[0], xy[1], 0., 1.);
		gl.vertexAttrib1f(a_PointSize, 10.);
		gl.uniform4f(u_FragColor,rgba[0],rgba[1],rgba[2],rgba[3]);
		gl.drawArrays(gl.POINTS, 0, 1);
	}	
}