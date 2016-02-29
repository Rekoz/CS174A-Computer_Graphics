// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;

		
// *******************************************************	
// When the web page's window loads it creates an Animation object, which registers itself as a displayable object to our other class GL_Context -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( 0, 0, 0, 1 );			// Background color

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" );
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		self.m_bowl = new bowl();
		self.m_ufo = new ufo();
		
		self.camera_transform = translate(0, 0,-40);
		self.projection_transform = perspective(45, canvas.width/canvas.height, .1, 100);		// The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		
		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.animation_time = 0
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.camera_transform = mult( rotate( 3, 0, 0,  1 ), self.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.camera_transform = mult( rotate( 3, 0, 0, -1 ), self.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0005 * animation_delta_time;
		var meters_per_frame  = .03 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.camera_transform = mult( rotate( velocity, i, 1-i, 0 ), self.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.camera_transform = mult( translate( scale_vec( meters_per_frame, thrust ) ), self.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

Animation.prototype.drawUFO = function(model_transform)
	{
		model_transform = mult( model_transform, translate( 0, 8, 0) );
		model_transform = mult( model_transform, rotate( 90, 1, 0, 0 ) );
		model_transform = mult( model_transform, rotate( -this.animation_time/50, 0, 0, 1 ) );
		model_transform = mult( model_transform, translate( 0, Math.sin(this.animation_time/1000*Math.PI/2), Math.sin(this.animation_time/1000*Math.PI/2)) );
		model_transform = mult( model_transform, scale( 0.8, 0.8, 0.25 ) );
		gl.uniform4fv( g_addrs.color_loc, 			vec4( .28,.28,.42,1 ) );
		this.m_ufo.draw(model_transform, this.camera_transform, this.projection_transform);
		model_transform = mult( model_transform, scale( 1.25, 1.25, 4 ) );
		model_transform = mult( model_transform, translate( 0, 0, 0.25) );
		model_transform = mult( model_transform, scale( 0.8, 0.8, 0.03 ) );
		this.m_sphere.draw(model_transform, this.camera_transform, this.projection_transform);
	}

Animation.prototype.drawEarth = function(model_transform)
	{
		model_transform = mult( model_transform, rotate( -this.animation_time/200, 0, 1, 0 ) );
		model_transform = mult( model_transform, scale( 5, 5, 5) );
		this.m_sphere.draw( model_transform, this.camera_transform, this.projection_transform, "earthmap1k.png" );
	}

Animation.prototype.drawSun = function(model_transform)
	{
		model_transform = mult( model_transform, scale( 8, 8, 8) );
		this.m_sphere.draw( model_transform, this.camera_transform, this.projection_transform, "sun.jpg" );
	}

Animation.prototype.drawBody = function(model_transform)
	{
		model_transform = mult( model_transform, rotate( -this.animation_time/100, 0, 1, 0 ) );
		model_transform = mult( model_transform, translate(7, 0, 0) );
		model_transform = mult( model_transform, scale( 1, 1/3, 1/3) );
		this.m_cube.draw( model_transform, this.camera_transform, this.projection_transform, "metal.jpg" );
		model_transform = mult( model_transform, scale( 1, 3, 3) );
		return model_transform;
	}

Animation.prototype.drawPanel = function(model_transform)
	{
		model_transform = mult( model_transform, scale(0.05, 1/3, 1/3));
		this.m_cube.draw( model_transform, this.camera_transform, this.projection_transform, "solarpanel.jpg" );
	}

// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		this.animation_delta_time = time - prev_time;
		if(animate) this.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		var basis_id = 0;
		
		var model_transform = mat4();
		
		/**********************************
		Start coding here!!!!
		**********************************/


		var stack = [];
		
		if (this.animation_time >= 25000 && this.animation_time <= 35000)
		// this.camera_transform = lookAt(vec3(Math.cos((this.animation_time-10000)/10000*Math.PI/2)*40, Math.sin((this.animation_time-10000)/10000*Math.PI/2)*40, 0), vec3(0,0,0), vec3(0,0,1));
			this.camera_transform = translate(0,0,-20-(this.animation_time-25000)/500);


		stack.push(model_transform);
			gl.uniform4fv( g_addrs.color_loc, 			vec4( 1,.92,.04,.9 ) );
			this.drawSun(model_transform);
			stack.push(model_transform);
				model_transform = mult( model_transform, rotate( -this.animation_time/200, 0, 1, 0 ) );
				model_transform = mult( model_transform, translate(20, 0, 0) );
				if (this.animation_time >= 10000 && this.animation_time < 20000)
				{
					var x2 = model_transform[0][3], y2 = model_transform[1][3], z2 = model_transform[2][3];
					stack.push(model_transform);
						model_transform = mult( model_transform, translate(0, 15, -3));
						var x1 = model_transform[0][3], y1 = model_transform[1][3], z1 = model_transform[2][3];
					model_transform = stack.pop();
					this.camera_transform = lookAt(vec3(x1, y1, z1), vec3(x2, y2, z2), vec3(0, 1, 0));
				}
				gl.uniform4fv( g_addrs.color_loc, 			vec4( 1,1,1,1 ) );
				this.drawEarth(model_transform);
				this.drawUFO(model_transform);
				if (this.animation_time < 10000)
				{
					stack.push(model_transform);
						model_transform = mult( model_transform, rotate( -this.animation_time/100-50, 0, 1, 0 ) );
						model_transform = mult( model_transform, translate(7, 0, 0) );
						var x1 = model_transform[0][3], y1 = model_transform[1][3], z1 = model_transform[2][3];
					model_transform = stack.pop();
				}
				stack.push(model_transform);
					model_transform = this.drawBody(model_transform);
					if (this.animation_time < 10000)
					{
						var x2 = model_transform[0][3], y2 = model_transform[1][3], z2 = model_transform[2][3];
						this.camera_transform = lookAt(vec3(x1, y1, z1), vec3(x2, y2, z2), vec3(0, 1, 0));
					}
					stack.push(model_transform);
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						if (this.animation_time < 5000)
							model_transform = mult( model_transform, rotate( Math.sin(this.animation_time/5000*Math.PI/2)*80-80, 0, 0, 1 ) );
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						this.drawPanel(model_transform);
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						if (this.animation_time < 5000)
							model_transform = mult( model_transform, rotate( -Math.sin(this.animation_time/5000*Math.PI/2)*170+170, 0, 0, 1 ) );
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						this.drawPanel(model_transform);
					model_transform = stack.pop(model_transform);
					stack.push(model_transform);
						model_transform = mult( model_transform, scale(1,-1,1) );
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						if (this.animation_time < 5000)
							model_transform = mult( model_transform, rotate( Math.sin(this.animation_time/5000*Math.PI/2)*80-80, 0, 0, 1 ) );
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						this.drawPanel(model_transform);
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						if (this.animation_time < 5000)
							model_transform = mult( model_transform, rotate( -Math.sin(this.animation_time/5000*Math.PI/2)*170+170, 0, 0, 1 ) );
						model_transform = mult( model_transform, translate( 0, 1/6, 0) );
						this.drawPanel(model_transform);
					model_transform = stack.pop();
					stack.push(model_transform);
						if (this.animation_time > 5000 && this.animation_time < 7400)
						{
							model_transform = mult( model_transform, translate( -(this.animation_time-5000)/6000 , 0, 0) );
							model_transform = mult( model_transform, rotate(-90, 0, 1, 0) );
							model_transform = mult( model_transform, scale(0.15, 0.15, 0.2) );
							this.m_bowl.draw( model_transform, this.camera_transform, this.projection_transform );
						}
						if (this.animation_time > 7400)
						{
							model_transform = mult( model_transform, translate( -0.4, 0, 0) );
							model_transform = mult( model_transform, rotate(-90, 0, 1, 0) );
							model_transform = mult( model_transform, scale(0.15, 0.15, 0.2) );
							this.m_bowl.draw( model_transform, this.camera_transform, this.projection_transform );
						}
					model_transform = stack.pop();
				model_transform = stack.pop();
			model_transform = stack.pop();
		model_transform = stack.pop();


		
		
		// gl.uniform4fv( g_addrs.color_loc, 			vec4( .9,.5,.9,1 ) );										// Send a desired shape color to the graphics card
		// model_transform = mult( model_transform, translate( 0, 10, -15) );										// Position the next shape by post-multiplying another matrix onto the current matrix product
		// this.m_cube.draw( model_transform, this.camera_transform, this.projection_transform );					// Draw a Cube
		// this.m_axis.draw( basis_id++, model_transform, this.camera_transform, this.projection_transform );		// How to draw a set of axes, conditionally displayed - cycle through by pressing p and m
		
		// gl.uniform4fv( g_addrs.color_loc, 			vec4( .5,.5,.5,1 ) );
		// model_transform = mult( model_transform, translate( 0, -2, 0 ) );		
		// this.m_fan.draw( model_transform, this.camera_transform, this.projection_transform );					// Cone
		// this.m_axis.draw( basis_id++, model_transform, this.camera_transform, this.projection_transform );
		
		// model_transform = mult( model_transform, translate( 0, -4, 0 ) );
		// this.m_cylinder.draw( model_transform, this.camera_transform, this.projection_transform );				// Tube
		// this.m_axis.draw( basis_id++, model_transform, this.camera_transform, this.projection_transform );
		
		// model_transform = mult( model_transform, translate( 0, -3, 0 ) );											// Example Translate
		// model_transform = mult( model_transform, rotate( this.animation_time/20, 0, 1, 0 ) );						// Example Rotate
		// model_transform = mult( model_transform, scale( 5, 1, 5 ) );												// Example Scale
		// this.m_sphere.draw( model_transform, this.camera_transform, this.projection_transform, "stars.png" );	// Sphere
		
		// model_transform = mult( model_transform, translate( 0, -2, 0 ) );
		// this.m_strip.draw( model_transform, this.camera_transform, this.projection_transform, "stars.png" );	// Rectangle
		// this.m_axis.draw( basis_id++, model_transform, this.camera_transform, this.projection_transform );
		
	}	



Animation.prototype.update_strings = function( debug_screen_object )
{
	debug_screen_object.fps = 1/ this.animation_delta_time * 100;
	// debug_screen_object.string_map["time"] = "Time: " + this.animation_time/1000 + "s";
	// debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	// debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	// debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
}