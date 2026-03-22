import { runSample } from "./executionService.js";

const code = `
#include <iostream>
using namespace std;
int main(){
// for cf like style
   int t;
cin >> t;
while(t--){
   int a,b;
    cin >> a >> b;
    cout << a+b<< endl;
}

// for single inputs-
//  int a,b;
// while(cin>>a>>b){
// cout<<a+b<<endl;
// }
  return 0;
}
`;

  const sampleTestcases= [
    { input: "1 1", output: "2" },
    { input: "2 3", output: "5" },
    { input: "5 7", output: "12" },
    { input: "10 20", output: "30" },
    { input: "100 200", output: "300" },
    // Incremental pattern
    { input: "1 2", output: "3" },
    { input: "2 4", output: "6" },
    { input: "3 6", output: "9" },
    { input: "4 8", output: "12" },
    { input: "5 10", output: "15" },
    { input: "6 12", output: "18" },
    { input: "7 14", output: "21" },
    { input: "8 16", output: "24" },
    { input: "9 18", output: "27" },
    { input: "10 20", output: "30" },
    // Sequential increasing
    { input: "11 22", output: "33" },
    { input: "12 24", output: "36" },
    { input: "13 26", output: "39" },
    { input: "14 28", output: "42" },
    { input: "15 30", output: "45" },
    { input: "16 32", output: "48" },
    { input: "17 34", output: "51" },
    { input: "18 36", output: "54" },
    { input: "19 38", output: "57" },
    { input: "20 40", output: "60" },
    // Larger numbers
    { input: "50 75", output: "125" },
    { input: "60 90", output: "150" },
    { input: "70 105", output: "175" },
    { input: "80 120", output: "200" },
    { input: "90 135", output: "225" },
    { input: "100 150", output: "250" },
    { input: "200 300", output: "500" },
    { input: "300 400", output: "700" },
    { input: "400 500", output: "900" },
    { input: "500 600", output: "1100" },
    // Edge values
    { input: "0 0", output: "0" },
    { input: "0 5", output: "5" },
    { input: "5 0", output: "5" },
    { input: "-1 1", output: "0" },
    { input: "-5 -5", output: "-10" },
    { input: "-10 20", output: "10" },
    { input: "20 -10", output: "10" },

    // Mixed ranges (auto-generated pattern)
    // ...Array.from({ length: 100 }, (_, i) => {
    //   const a = i + 1;
    //   const b = (i + 1) * 3;
    //   return { input: `${a} ${b}`, output: `${a + b}` };
    // })
  ];
const timelimit=2;
const result = await runSample({sampleTestcases,timelimit}, code);
console.log(result);

