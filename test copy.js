const query1 = "SELECT id, image FROM images WHERE id!=10 OR album=2";
const query2 = "SELECT position,AVG(salary) FROM employees GROUP BY job_id HAVING AVG(salary)>10000";

const columns1 = ['id', 'image', 'album', 'value'];
const columns2 = ['job_id', 'salary', 'position', 'level'];


function matchColumns(query, columns) {
    conditions = query.split('FROM ')[1];
    for (const item of columns) {
       const regex = new RegExp(`\\b${item}\\b`, 'i'); // 'i' flag for case insensitive match
       if (regex.test(conditions)) {
         console.log(item);
       }
    }
 }

// Test with query1 and columns1
const result1 = matchColumns(query1, columns1);
//console.log("Result for query1:", result1); //


// Test with query2 and columns2
const result2 = matchColumns(query2, columns2);
//console.log("Result for query2:", result2); // Output: ['job_id', 'salary']
