//
// template-rt.cpp
//

#define _CRT_SECURE_NO_WARNINGS
#include "matm.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

int g_width;
int g_height;
const int MAX_DEPTH = 3;
const float MAX_DISTANCE = 1000.0;
const float MIN_HIT_TIME = 0.0001f;
bool inside;
int intersectedSphere;

struct Ray
{
    vec4 origin;
    vec4 dir;
};

// DONE: add structs for spheres, lights and anything else you may need.
struct Sphere
{
	string name; // Name
    vec4 position; // Positions
    float s_x, s_y, s_z; // Scaling values
    vec3 color; // Color values
    float k_a, k_d, k_s, k_r; // Coefficients of ambient, diffuse, specular reflections, and reflection rays
    float n; // Specularity

	mat4 transform; // Transform matrix of the sphere
	mat4 inverted; // Inverse of the transform matrix
};

struct Light
{
    string name; // Name
    vec4 position; // Light positions
    vec3 color; // Light color/intensity
};

enum statuses { LIGHT_SOURCE, NO_INTERSECTION };

vector<vec4> g_colors;
vector<Sphere> spheres; // Sphere vector
vector<Light> lights; // Light vector

float g_left;
float g_right;
float g_top;
float g_bottom;
float g_near;

vec3 g_background; // Background color

vec3 g_ambient; // Ambient color/intensity

string output_name; // Output filename


// -------------------------------------------------------------------
// Input file parsing

vec4 toVec4(const string& s1, const string& s2, const string& s3)
{
    stringstream ss(s1 + " " + s2 + " " + s3);
    vec4 result;
    ss >> result.x >> result.y >> result.z;
    result.w = 1.0f;
    return result;
}

vec3 toVec3(const string& s1, const string& s2, const string& s3)
{
	stringstream ss(s1 + " " + s2 + " " + s3);
	vec3 result;
	ss >> result.x >> result.y >> result.z;
	return result;
}

float toFloat(const string& s)
{
    stringstream ss(s);
    float f;
    ss >> f;
    return f;
}

void parseLine(const vector<string>& vs)
{
    //DONE: add parsing of NEAR, LEFT, RIGHT, BOTTOM, TOP, SPHERE, LIGHT, BACK, AMBIENT, OUTPUT.
	const int num_labels = 11;// 0      1       2          3       4      5     6          7        8        9          10
	const string labels[] = { "NEAR", "LEFT", "RIGHT", "BOTTOM", "TOP", "RES", "SPHERE", "LIGHT", "BACK", "AMBIENT", "OUTPUT" };
	unsigned label_id = find(labels, labels + num_labels, vs[0]) - labels;
	
	switch (label_id)
	{
		case 0: g_near = toFloat(vs[1]); break; // NEAR
		case 1: g_left = toFloat(vs[1]); break; // LEFT
		case 2: g_right = toFloat(vs[1]); break; // RIGHT
		case 3: g_bottom = toFloat(vs[1]); break; // BOTTOM
		case 4: g_top = toFloat(vs[1]); break; // TOP
		case 5:
			g_width = (int)toFloat(vs[1]);
			g_height = (int)toFloat(vs[2]);
			g_colors.resize(g_width * g_height);
			break; // RES
		case 6:
		{
			Sphere sphere;
			sphere.name = vs[1];
			sphere.position = toVec4(vs[2], vs[3], vs[4]);
			sphere.s_x = toFloat(vs[5]);
			sphere.s_y = toFloat(vs[6]);
			sphere.s_z = toFloat(vs[7]);
			sphere.color = toVec3(vs[8], vs[9], vs[10]);
			sphere.k_a = toFloat(vs[11]);
			sphere.k_d = toFloat(vs[12]);
			sphere.k_s = toFloat(vs[13]);
			sphere.k_r = toFloat(vs[14]);
			sphere.n = toFloat(vs[15]);
			sphere.transform = Translate(sphere.position);
			sphere.transform *= Scale(sphere.s_x, sphere.s_y, sphere.s_z);
			if (!InvertMatrix(sphere.transform, sphere.inverted))
			{
				cout << "Unable to invert the matrix" << endl;
				exit(1);
			}
			spheres.push_back(sphere);
			break;
		} // Sphere
		case 7:
		{
			Light light;
			light.name = vs[1];
			light.position = toVec4(vs[2], vs[3], vs[4]);
			light.color = toVec3(vs[5], vs[6], vs[7]);
			lights.push_back(light);
			break;
		} // Light
        case 8:
			g_background = toVec3(vs[1], vs[2], vs[3]); 
            break; // Background Color
        case 9:
			g_ambient = toVec3(vs[1], vs[2], vs[3]);
            break; // Ambient light
        case 10:
            output_name = vs[1];
            break; // Output filename
        default:
            break;
	}
}

void loadFile(const char* filename)
{
    ifstream is(filename);
    if (is.fail())
    {
        cout << "Could not open file " << filename << endl;
        exit(1);
    }
    string s;
    vector<string> vs;
    while(!is.eof())
    {
        vs.clear();
        getline(is, s);
        istringstream iss(s);
        while (!iss.eof())
        {
            string sub;
            iss >> sub;
            vs.push_back(sub);
        }
        parseLine(vs);
    }
}


// -------------------------------------------------------------------
// Utilities

void setColor(int ix, int iy, const vec4& color)
{
    int iy2 = g_height - iy - 1; // Invert iy coordinate.
    g_colors[iy2 * g_width + ix] = color;
}


// -------------------------------------------------------------------
// Intersection routine

// DONE: add your ray-sphere intersection routine here.

vec4 intersect(const Ray& ray, const int &depth)
{
	int numSpheres = spheres.size();
	vec4 closest = vec4(0.0f, 0.0f, -MAX_DISTANCE, 1.0f); // Set the current closest point to be very far away
	float shortestDistance = MAX_DISTANCE; // Shortest distance from ray.origin
	for (int i = 0; i < numSpheres; i++)
	{
		/* Invert the ray */
		Ray invertedRay;
		invertedRay.origin = spheres[i].inverted * ray.origin;
		invertedRay.dir = spheres[i].inverted * ray.dir;

		/* Trim to vec3 for calculation */
		vec3 origin = vec3(invertedRay.origin.x, invertedRay.origin.y, invertedRay.origin.z);
		vec3 dir = vec3(invertedRay.dir.x, invertedRay.dir.y, invertedRay.dir.z);

		float A = dot(dir, dir);
		float B = dot(dir, origin);
		float C = dot(origin, origin) - 1;
		float D = B * B - A * C;

		if (D < 0) continue; // No intersection

		float E = sqrtf(D);
		float t1 = (E - B) / A;
		float t2 = (-E - B) / A;

		bool flag = false;
		vec4 intersectionPoint;

		if (depth == 0) // Primary ray
		{
			if (t1 > t2)
			{
				float temp = t1;
				t1 = t2;
				t2 = temp;
			}
			intersectionPoint = ray.origin + t1 * ray.dir;
			if (intersectionPoint.z > -g_near) // If the nearer intersecting point is out of scene
			{
				intersectionPoint = ray.origin + t2 * ray.dir; // Try the farther intersecting point
				if (intersectionPoint.z > -g_near) // If the farther intersecting point is still out of scene, the sphere is out of scene
					continue;
				flag = true; // The sphere is cut by plane
			}
		}
		else {
			if (t1 > MIN_HIT_TIME)
			{
				if (t2 > MIN_HIT_TIME && t2 < t1) // t1 > 0, t2 > 0 and t2 < t1
					intersectionPoint = ray.origin + t2 * ray.dir;
				else // t1 > 0 and t2 <= 0, or t1 > 0, t2 > 0 and t2 > t1
					intersectionPoint = ray.origin + t1 * ray.dir;
				if (t2 <= 0) // t1 > 0 and t2 <= 0, intersecting point is inside the sphere
					flag = true; // Origin is inside the sphere
			}
			else {
				if (t2 > MIN_HIT_TIME) // t1 <= 0, t2 > 0, intersection point is inside the sphere
				{
					intersectionPoint = ray.origin + t2 * ray.dir;
					flag = true; // Origin is inside the sphere
				}
				else // t1 <= 0, t2 <= 0, no intersection point
					continue;
			}
		}

		/* Test if the current intersecting point is closer */
		float lenIR = length(intersectionPoint - ray.origin);
		if (lenIR < shortestDistance)
		{
			shortestDistance = lenIR;
			closest = intersectionPoint;
			inside = flag;
			intersectedSphere = i;
		}
	}
	return closest;
}

bool shadowRay(const vec4 &interPoint, const vec4 &lightPoint)
{
	vec4 shadowRayDir = lightPoint - interPoint;
	int numSpheres = spheres.size();
	for (int i = 0; i < numSpheres; i++)
	{
		Ray invertedRay;
		invertedRay.origin = spheres[i].inverted * interPoint;
		invertedRay.dir = spheres[i].inverted * shadowRayDir;
		vec3 origin = vec3(invertedRay.origin.x, invertedRay.origin.y, invertedRay.origin.z);
		vec3 dir = vec3(invertedRay.dir.x, invertedRay.dir.y, invertedRay.dir.z);

		float A = dot(dir, dir);
		float B = dot(dir, origin);
		float C = dot(origin, origin) - 1;
		float D = B * B - A * C;

		if (D < 0) continue;

		float E = sqrtf(D);
		float t1 = (E - B) / A;
		float t2 = (-E - B) / A;

		/* If the hit time is larger than 0.0001 and less than 1, the shadow ray hits a sphere between the light source and its origin*/
		if ((t1 > MIN_HIT_TIME && t1 < 1) || (t2 > MIN_HIT_TIME && t2 < 1))
			return true;
	}
	return false;
}

// -------------------------------------------------------------------
// Ray tracing

vec4 getEllipsoidNormal(vec4 interPoint, const Sphere &currentSphere)
{
	/* Normal to ellipsoid is obtained by multiplying the 
	   inverse transpose of the transform matrix with the
	   normal of the corresponding unit sphere */
	vec4 p = currentSphere.inverted * interPoint;
	mat4 invTrans = transpose(currentSphere.inverted);
	p = invTrans * p;
	return normalize(vec4(p.x, p.y, p.z, 0.0));
}

vec4 trace(const Ray& ray, int depth)
{
    // DONE: implement your ray tracing routine here.
	if (depth == MAX_DEPTH) return vec4();
	vec4 q = intersect(ray, depth);

	if (q.z == -MAX_DISTANCE)
	{
		/* If it's a primary ray, background color should be returned.
		   Otherwise, no color should be returned. */
		if (depth == 0)
			return g_background;
		else
			return vec4();
	}

	/* First, set the ambient light. */
	const Sphere &currentSphere = spheres[intersectedSphere];
	vec3 color = currentSphere.k_a * g_ambient * currentSphere.color;

	vec4 N = getEllipsoidNormal(q, currentSphere),
		V = normalize(ray.origin - q);

	int numLights = lights.size();
	for (int i = 0; i < numLights; i++)
	{
		if (!shadowRay(q, lights[i].position)) // No obstruction
		{
			vec4 L = normalize(lights[i].position - q),
				R = normalize(2 * dot(L, N) * N - L);
			// if (inside) N = -N; // If uncomment it, the hollow sphere will only get ambient light, since NL will be less than 0.
			float NL = dot(N, L);
			if (NL > 0)
			{
				/* Diffuse component */
				color += currentSphere.k_d * lights[i].color * NL * currentSphere.color;
				float RV = dot(R, V);
				if (RV > 0 && !inside)
					/* Specular component */
					color += currentSphere.k_s * lights[i].color * pow(RV, currentSphere.n);
			}
		}
	}

	/* If current sphere is reflective, recursively calculate the reflected light. */
	if (currentSphere.k_r > 0)
	{
		Ray rRay;
		rRay.origin = q;
		rRay.dir = normalize(2 * dot(V, N) * N - V);
		vec4 rColor = currentSphere.k_r * trace(rRay, depth + 1);
		color += vec3(rColor.x, rColor.y, rColor.z);
	}

	/* Clamp the color value */
	if (color.x > 1.0) color.x = 1.0;
	if (color.y > 1.0) color.y = 1.0;
	if (color.z > 1.0) color.z = 1.0;
	if (color.x < 0.0) color.x = 0.0;
	if (color.y < 0.0) color.y = 0.0;
	if (color.z < 0.0) color.z = 0.0;
	return vec4(color);
}

vec4 getDir(int ix, int iy)
{
    // DONE: modify this. This should return the direction from the origin
    // to pixel (ix, iy), normalized.
    float x = (g_right - g_left) / (float)g_width * (float)ix + g_left;
    float y = (g_top - g_bottom) / (float)g_height * (float)iy + g_bottom;
    float z = -g_near;
    return normalize(vec4(x, y, z, 0.0f));
}

void renderPixel(int ix, int iy)
{
	Ray ray;
	ray.origin = vec4(0.0f, 0.0f, 0.0f, 1.0f);
	ray.dir = getDir(ix, iy);
	vec4 color = trace(ray, 0);
    setColor(ix, iy, color);
}

void render()
{
    for (int iy = 0; iy < g_height; iy++)
        for (int ix = 0; ix < g_width; ix++)
            renderPixel(ix, iy);
}


// -------------------------------------------------------------------
// PPM saving

void savePPM(int Width, int Height, char* fname, unsigned char* pixels) 
{
    FILE *fp;
    const int maxVal=255;

    printf("Saving image %s: %d x %d\n", fname, Width, Height);
    fp = fopen(fname,"wb");
    if (!fp) {
        printf("Unable to open file '%s'\n", fname);
        return;
    }
    fprintf(fp, "P6\n");
    fprintf(fp, "%d %d\n", Width, Height);
    fprintf(fp, "%d\n", maxVal);

    for(int j = 0; j < Height; j++) {
        fwrite(&pixels[j*Width*3], 3, Width, fp);
    }

    fclose(fp);
}

void saveFile()
{
    // Convert color components from floats to unsigned chars.
    // DONE: clamp values if out of range.
    unsigned char* buf = new unsigned char[g_width * g_height * 3];
    for (int y = 0; y < g_height; y++)
        for (int x = 0; x < g_width; x++)
            for (int i = 0; i < 3; i++)
                buf[y*g_width*3+x*3+i] = (unsigned char)(((float*)g_colors[y*g_width+x])[i] * 255.9f);
    
    // DONE: change file name based on input file name.
    savePPM(g_width, g_height, (char*)output_name.c_str(), buf);
    delete[] buf;
}


// -------------------------------------------------------------------
// Main

int main(int argc, char* argv[])
{
    if (argc < 2)
    {
        cout << "Usage: template-rt <input_file.txt>" << endl;
        exit(1);
    }
    loadFile(argv[1]);
    render();
    saveFile();
	return 0;
}