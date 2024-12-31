#include <bits/stdc++.h>
#include <windows.h>
using namespace std;

int main(){
	
	HWND hwnd = GetForegroundWindow(); 
	ShowWindow(hwnd, 0);
	system("node ./server/server.js");
	
	return 0;
}
