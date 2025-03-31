
import FCS from '../node_modules/fcs/fcs.js';
import Plotly from '../node_modules/plotly.js-dist';
import { pinv,multiply,transpose,abs,sign,log10,add,dotMultiply,matrix,median,subtract } from '../node_modules/mathjs';

let directoryHandle;
let UnmixfileHandle;
let csvArray;
let ChannelNames;
let A_Array;
let A_pinv;

let PrimaryValueList;
let SecondaryValueList;
let PSValueList;
let selectedPrimaryValue;
let selectedSecondaryValue;
let selectedPSValue;
let selectedRowIndex;

let SCCfileHandle;
let fcsArray = [];
let fcs;
let fcsColumnNames = [];
let fcsArrayPlotset = [];
let x_val = '';
let y_val = '';

let selectedSubset_fcsArray;
let positivefcsArray;
let negativefcsArray;

let LefSig;
let medianPosValue;
let RawSig;
let CorrectFactor_default;
let CorrectFactor;

let A_Array_corrected;
let A_pinv_corrected;
let fcsArrayPlotset_corrected;
let x_val_corrected = '';
let y_val_corrected = '';
let selectedSubset_fcsArray_corrected;

let csvArray_Output

// Select fcs Data folder
document.getElementById('select-folder').addEventListener('click', async () => {
    try {
        // Show the directory picker
        directoryHandle = await window.showDirectoryPicker();
        
        // Get the name of the selected folder
        const folderName = directoryHandle.name;
        
        // Display the folder name
        document.getElementById('folder-name').textContent = `Selected Folder: ${folderName}`;
        
    } catch (error) {
        console.error('Error selecting folder:', error);
    }
});

// Select unmixing matrix csv file
document.getElementById('file-input').addEventListener('change', (event) => {
    const fileInput = event.target;
    if (fileInput.files.length > 0) {
        UnmixfileHandle = fileInput.files[0];
        const fileName = UnmixfileHandle.name;
        document.getElementById('file-name').textContent = `Selected File: ${fileName}`;
        document.getElementById('read-csv').disabled = false;
    }
});

// Read unmixing matrix csv file
document.getElementById('read-csv').addEventListener('click', async () => {
    try {
        if (!UnmixfileHandle) {
            alert('Please select a file first.');
            return;
        }

        // Read the file
        const text = await UnmixfileHandle.text();
        
        // Parse CSV content using PapaParse
        Papa.parse(text, {
            header: true,
            complete: function(results) {
                csvArray = results.data;
                console.log('CSV Array:', csvArray);
                ChannelNames = results.meta.fields;
                ChannelNames = ChannelNames.slice(2);
                console.log('ChannelNames:', ChannelNames);
                // check if last row is empty
                if (csvArray.length > 0 && Object.values(csvArray[csvArray.length - 1]).every(value => value === "")) {
                    csvArray.pop(); // remove last row
                }
                let twoDimArray = csvArray.map(obj => Object.values(obj));
                A_Array = twoDimArray.map(row => row.slice(2).map(Number));//remove first two columns (primary and secondary labels)
                A_Array = transpose(A_Array);
                console.log('A_Array:', A_Array);

                PSValueList = csvArray.map(row => {
                    const primaryValue = row[Object.keys(row)[0]];
                    const secondaryValue = row[Object.keys(row)[1]];
                    return `${primaryValue} - ${secondaryValue}`;
                });

                PrimaryValueList = csvArray.map(row => {
                    const primaryValue = row[Object.keys(row)[0]];
                    return `${primaryValue}`;
                });

                SecondaryValueList = csvArray.map(row => {
                    const secondaryValue = row[Object.keys(row)[1]];
                    return `${secondaryValue}`;
                });
                console.log('PSValueList:', PSValueList);
                console.log('PrimaryValueList:', PrimaryValueList);
                console.log('SecondaryValueList:', SecondaryValueList);
            }
        });

        //show csvArray
        displayCSVTable(csvArray);

        //show sccsig-dropdown-select
        document.getElementById('csv-dropdown').style.display = 'block';
        PosSigDropdown(csvArray);

        //show "sccsig-dropdown-select-reminder
        document.getElementById('sccsig-dropdown-select-reminder').style.display = 'block';
        //calculate pinv matrix
        A_pinv = pinv(A_Array);
        console.log('A_pinv:', A_pinv);
        let MultiplyMatrix = multiply(A_pinv, A_Array);
        console.log('MultiplyMatrix:', MultiplyMatrix);
    } catch (error) {
        console.error('Error reading CSV file:', error);
    }
});

// Display unmixing matrix csv file
function displayCSVTable(data) {
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');

    // Create table headers
    Object.keys(data[0]).forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Create table rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    // Append table to the div
    document.getElementById('csv-table').innerHTML = '';
    document.getElementById('csv-table').appendChild(table);
}

// Show Dropdown to select positive signature
function PosSigDropdown(data) {
    const dropdown = document.getElementById('csv-dropdown');
    dropdown.innerHTML = '';

    data.forEach((row, index) => {
        const option = document.createElement('option');
        option.textContent = `${row[Object.keys(row)[0]]} - ${row[Object.keys(row)[1]]}`;
        option.value = index; // Store the row index as the option value
        dropdown.appendChild(option);
    });
    populateFileDropdown(directoryHandle);
    document.getElementById('file-dropdown-select-alert').style.display = 'block';
    document.getElementById('file-dropdown').style.display = 'block';

    dropdown.addEventListener('change', (event) => {
        selectedRowIndex = event.target.value;
        selectedPrimaryValue = `${data[selectedRowIndex][Object.keys(data[selectedRowIndex])[0]]}`;
        selectedSecondaryValue= `${data[selectedRowIndex][Object.keys(data[selectedRowIndex])[1]]}`;
        selectedPSValue = `${data[selectedRowIndex][Object.keys(data[selectedRowIndex])[0]]} - ${data[selectedRowIndex][Object.keys(data[selectedRowIndex])[1]]}`;
        console.log('Selected Value:', selectedPSValue);
        console.log('Selected Primary Value:', selectedPrimaryValue);
        console.log('Selected Secondary Value:', selectedSecondaryValue);
        console.log('Selected Row Index:', selectedRowIndex);
        console.log('directoryHandle:', directoryHandle);
        
    });
}



// Show Dropdown to select scc fcs file for positive signature
async function populateFileDropdown(directoryHandle) {
    const fileDropdown = document.getElementById('file-dropdown');
    fileDropdown.innerHTML = '';

    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
            const option = document.createElement('option');
            option.textContent = entry.name;
            option.value = entry.name;
            fileDropdown.appendChild(option);
        }
    }

    fileDropdown.addEventListener('change', async (event) => {
        const selectedFileName = event.target.value;
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name === selectedFileName) {
                SCCfileHandle = entry;
                document.getElementById('file-dropdown-name').textContent = `Selected File: ${SCCfileHandle.name}`;
                document.getElementById('run-button').style.display = 'block';
                break;
            }
        }
    });
}

// Read selected scc fcs file
async function readFCSFile() {
    //show file-reading-reminder
    document.getElementById('file-reading-reminder').style.display = 'block';
    if (SCCfileHandle) {
        const file = await SCCfileHandle.getFile();
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            console.log("arrayBuffer: ", arrayBuffer); 
            const buffer = Buffer.from(arrayBuffer);
            console.log("buffer: ", buffer); 
            fcs = new FCS({ dataFormat: 'asNumber', eventsToRead: -1}, buffer);
            console.log("fcs: ", fcs); 
            // fcsArray
            fcsArray = fcs.dataAsNumbers; 
            // fcsColumnNames
            const text = fcs.text;
            const columnNames = [];
            for (let i = 1; text[`$P${i}S`]; i++) {
                columnNames.push(text[`$P${i}S`]);
            }
            fcsColumnNames = columnNames;
            console.log("fcsArray: ",fcsArray); 
            console.log('Column Names:', fcsColumnNames);
            //filter fcsArray
            var filteredfcsArrayforUnmix = filterFCSArrayByChannelNames(fcsArray, fcsColumnNames, ChannelNames);
            filteredfcsArrayforUnmix = transpose(filteredfcsArrayforUnmix);
            console.log('Filtered FCS Array:', filteredfcsArrayforUnmix);
            //Do unmixing
            let unmixedMatrix = multiply(A_pinv, filteredfcsArrayforUnmix);
            unmixedMatrix = transpose(unmixedMatrix);
            console.log('unmixedMatrix:', unmixedMatrix);
            // add unmixedMatrix back to fcsArray 
            fcsArray = mergeArraysHorizontally(fcsArray, unmixedMatrix);
            console.log('Merged fcsArray:', fcsArray);
            fcsColumnNames = fcsColumnNames.concat(PSValueList)
            console.log('Merged fcsColumnNames:', fcsColumnNames);
            // change file-reading-reminder
            document.getElementById('file-reading-reminder').innerText = 'Done reading the scc file!';
            //show find-lefsig-button
            document.getElementById('find-lefsig-button').style.display = 'block';
        };
        reader.readAsArrayBuffer(file);
    } else {
        console.error('No file selected');
    }
}

function filterFCSArrayByChannelNames(fcsArray, fcsColumnNames, ChannelNames) {
    // Create an array to store the indices of the columns to keep
    const indicesToKeep = ChannelNames.map(channel => fcsColumnNames.indexOf(channel)).filter(index => index !== -1);

    // Filter the fcsArray to keep only the columns with the specified indices
    const filteredFCSArray = fcsArray.map(row => indicesToKeep.map(index => row[index]));

    return filteredFCSArray;
}

function mergeArraysHorizontally(array1, array2) {
    if (array1.length !== array2.length) {
        throw new Error('The arrays must have the same number of rows to merge them horizontally.');
    }

    return array1.map((row, index) => row.concat(array2[index]));
}

document.getElementById('run-button').addEventListener('click', readFCSFile);

// Select x and y axes
document.getElementById('find-lefsig-button').addEventListener('click', () => {
    //Generate axis pulldown for raw and corrected plots
    populateColumnDropdowns('x-dropdown',fcsColumnNames);
    populateColumnDropdowns('y-dropdown',fcsColumnNames);
    populateColumnDropdowns('corrected-x-dropdown',fcsColumnNames);
    populateColumnDropdowns('corrected-y-dropdown',fcsColumnNames);

    document.getElementById('x-dropdown').style.display = 'block';
    document.getElementById('x-dropdown-select-reminder').style.display = 'block';
    document.getElementById('y-dropdown').style.display = 'block';
    document.getElementById('y-dropdown-select-reminder').style.display = 'block';

    document.getElementById('plot-button').style.display = 'block';
})

function populateColumnDropdowns(dropdownelement_id,options) {
    const Dropdown = document.getElementById(dropdownelement_id);
    Dropdown.innerHTML = '';

    options.forEach(name => {
        const Option = document.createElement('option');
        Option.textContent = name;
        Option.value = name;
        Dropdown.appendChild(Option);
    });
}

document.getElementById('x-dropdown').addEventListener('change', function(event) {
    x_val = event.target.value;
    console.log('Selected x_val:', x_val);
});

document.getElementById('y-dropdown').addEventListener('change', function(event) {
    y_val = event.target.value;
    console.log('Selected y_val:', y_val);
});

// Create scatter plot
function getRandomSubset(array, size) {
    const shuffled = array.slice(0);
    let i = array.length;
    let min = i - size;
    let temp, index;
  
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
  
    return shuffled.slice(min);
}

function generatePlotSubset(fcsArrayInput){
    var Plotset
    if (fcsArrayInput.length > 10000) {
        Plotset = getRandomSubset(fcsArrayInput, 10000);
    } else if (fcsArray.length == 0){
        console.error('fcsArrayInput is empty');
    } else {
        Plotset = fcsArrayInput
    }
    console.log('Plotset Data:', Plotset); 
    return Plotset
}

function createPlotset(fcsArrayPlotset,x_val,y_val,fcsColumnNames) {
    const xIndex = fcsColumnNames.indexOf(x_val);
    const yIndex = fcsColumnNames.indexOf(y_val);
    if (xIndex === -1 || yIndex === -1) {
        console.error('Invalid column names');
        return;
    }
    var xData = fcsArrayPlotset.map(row => row[xIndex]);
    var yData = fcsArrayPlotset.map(row => row[yIndex]);
    //scale
    xData = dotMultiply(sign(xData),log10(add(abs(xData),1)))
    yData = dotMultiply(sign(yData),log10(add(abs(yData),1)))
    const trace = {
        x: xData,
        y: yData,
        mode: 'markers',
        type: 'scatter'
    };

    const layout = {
        title: 'Scatter Plot',
        xaxis: { title: x_val + " (log10)"},
        yaxis: { title: y_val + " (log10)"},
        dragmode: 'select' // Enable selection mode
    };
    document.getElementById('plot-reminder').style.display = 'block';
    document.getElementById('plot-reminder').innerText = "Total cell counts: " + xData.length
    Plotly.newPlot('plot', [trace], layout);
    var selected_count = 0
    document.getElementById('selected-reminder').style.display = 'block';
    // Add event listener for selection
    const plotElement = document.getElementById('plot');
    plotElement.on('plotly_selected', function(eventData) {
        try{
            const selectedPoints_count = eventData.points.length
            const selectedPoints = eventData.points;
            const selectedIndices = selectedPoints.map(point => point.pointIndex);
            selectedSubset_fcsArray = selectedIndices.map(index => fcsArrayPlotset[index]);
            console.log('Selected Subset:', selectedSubset_fcsArray);
            document.getElementById('selected-reminder').innerText = "Selected cell count: " + selectedPoints_count
        } catch (error) {
            document.getElementById('selected-reminder').innerText = "Selected cell count: 0";
        }
    });
}

document.getElementById('plot-button').addEventListener('click', async () => {
    fcsArrayPlotset = generatePlotSubset(fcsArray)
    createPlotset(fcsArrayPlotset,x_val,y_val,fcsColumnNames);
    document.getElementById('replot-button').style.display = 'block';
    document.getElementById('set-positive-button').style.display = 'block';
    document.getElementById('set-negative-button').style.display = 'block';
    document.getElementById('calculation-button').style.display = 'block';
}); 

// Re-plot with selected population
document.getElementById('replot-button').addEventListener('click', async () => {
    createPlotset(selectedSubset_fcsArray,x_val,y_val,fcsColumnNames);
}); 

// set positive and negative population
document.getElementById('set-positive-button').addEventListener('click', async () => {
    try{
        positivefcsArray = selectedSubset_fcsArray
        console.log('positivefcsArray:', positivefcsArray);
        document.getElementById('set-positive-reminder').style.display = 'block';
        document.getElementById('set-positive-reminder').innerText = "A total of " + positivefcsArray.length + " cells are set as shifted positive population."
    } catch (error) {
        document.getElementById('set-positive-reminder').style.display = 'block';
        document.getElementById('set-positive-reminder').innerText = "No cells are set as shifted positive population. Try again!"
    }
}); 

document.getElementById('set-negative-button').addEventListener('click', async () => {
    try{
        negativefcsArray = selectedSubset_fcsArray
        console.log('negativefcsArray:', negativefcsArray);
        document.getElementById('set-negative-reminder').style.display = 'block';
        document.getElementById('set-negative-reminder').innerText = "A total of " + negativefcsArray.length + " cells are set as negative population."
    } catch (error) {
        document.getElementById('set-negative-reminder').style.display = 'block';
        document.getElementById('set-negative-reminder').innerText = "No cells are set as negative population. Try again!"
    }
}); 

// Calculate Lefsig
document.getElementById('calculation-button').addEventListener('click', async () => {
    //check positivefcsArray and negativefcsArray 
    if (positivefcsArray.length === 0 || negativefcsArray.length === 0) {
        document.getElementById('calculation-button-reminder').style.display = 'block';
        document.getElementById('calculation-button-reminder').innerText = "Please select positive and negative populations first.";
    }else{
        // Proceed with calculation
        try {
            // calculate LefSig, medianPosValue
            console.log('Calculating Lefsig with positive and negative populations...');
            const result = LefSigCalculater(positivefcsArray,negativefcsArray,fcsColumnNames,PSValueList,selectedPSValue,A_Array);
            const { LefSig, medianPosValue } = result;
            console.log('LefSig: ',LefSig);
            console.log('medianPosValue: ',medianPosValue);
            // calculate RawSig
            const selectedColIndex = PSValueList.indexOf(selectedPSValue);
            RawSig = A_Array.map(row => row[selectedColIndex]);
            console.log('RawSig: ',RawSig);
            document.getElementById('calculation-button-reminder').style.display = 'block';
            document.getElementById('calculation-button-reminder').innerText = "Calculation completed successfully.";

            // Set multiply factor
            if (medianPosValue != 0) {
                CorrectFactor_default = 1/medianPosValue
            }else{
                CorrectFactor_default = 0.01
            }
            // Assign x_val and y_val to x_val_corrected and y_val_corrected
            document.getElementById('corrected-x-dropdown').value = x_val;
            document.getElementById('corrected-y-dropdown').value = y_val;
            x_val_corrected = x_val;
            y_val_corrected = y_val;
            // Display input field for CorrectFactor
            document.getElementById('input-container').style.display = 'block';
            document.getElementById('correct-factor-input').value = CorrectFactor_default;

        } catch (error) {
            console.error('Error during calculation:', error);
            document.getElementById('calculation-button-reminder').style.display = 'block';
            document.getElementById('calculation-button-reminder').innerText = "An error occurred during calculation. Please try again.";
        }
    }
}); 

document.getElementById('submit-factor-button').addEventListener('click', () => {
    CorrectFactor = parseFloat(document.getElementById('correct-factor-input').value);
    console.log('User entered Correct Factor: ', CorrectFactor);
    A_Array_corrected = A_Array_corrected_calculater(A_Array,LefSig,CorrectFactor,PSValueList,selectedPSValue);
    console.log('A_Array_corrected: ', A_Array_corrected);
    A_pinv_corrected = pinv(A_Array_corrected);
    // UnmixCorrected
    fcsArrayPlotset_corrected = UnmixCorrected(fcsArrayPlotset,fcsColumnNames,ChannelNames,A_pinv_corrected,PSValueList)
    // Show x_val_corrected and y_val_corrected
    document.getElementById('corrected-x-dropdown').style.display = 'block';
    document.getElementById('corrected-x-dropdown-select-reminder').style.display = 'block';
    document.getElementById('corrected-y-dropdown').style.display = 'block';
    document.getElementById('corrected-y-dropdown-select-reminder').style.display = 'block';
    document.getElementById('corrected-plot-button').style.display = 'block';
   
});

document.getElementById('corrected-x-dropdown').addEventListener('change', function(event) {
    x_val_corrected = event.target.value;
    console.log('Selected x_val_corrected:', x_val_corrected);
    
});

document.getElementById('corrected-y-dropdown').addEventListener('change', function(event) {
    y_val_corrected = event.target.value;
    console.log('Selected y_val_corrected:', y_val_corrected);
    
});

function UnmixCorrected(fcsArraySubset,fcsColumnNames,ChannelNames,A_pinv_corrected,PSValueList){
    //filter fcsArray
    var filteredfcsArrayforUnmix = filterFCSArrayByChannelNames(fcsArraySubset, fcsColumnNames, ChannelNames);
    filteredfcsArrayforUnmix = transpose(filteredfcsArrayforUnmix);
    console.log('Filtered FCS Array for UnmixCorrected:', filteredfcsArrayforUnmix);
    //Do unmixing
    let unmixedMatrix = multiply(A_pinv_corrected, filteredfcsArrayforUnmix);
    unmixedMatrix = transpose(unmixedMatrix);
    console.log('unmixedMatrix for UnmixCorrected:', unmixedMatrix);
    //remove previous unmixed results from fcsArraySubset
    const numSigs = PSValueList.length;
    fcsArraySubset = fcsArraySubset.map(row => row.slice(0, -numSigs));
    console.log('fcsArraySubset without previous unmixed results:', unmixedMatrix);
    // add unmixedMatrix back to fcsArraySubset 
    fcsArraySubset = mergeArraysHorizontally(fcsArraySubset, unmixedMatrix);
    console.log('Merged fcsArraySubset for UnmixCorrected:', fcsArraySubset);

    return fcsArraySubset
}


function A_Array_corrected_calculater(A_Array,LefSig,CorrectFactor,PSValueList,selectedPSValue) {
    const selectedColIndex = PSValueList.indexOf(selectedPSValue);
    console.log('selectedColIndex: ',selectedColIndex);
    const LefSig_adjusted  = multiply(LefSig,CorrectFactor)
    console.log('LefSig_adjusted: ',LefSig_adjusted);
    //add LefSig_adjusted to the column selectedColIndex of A_Array
    A_Array_corrected = A_Array.map((row, rowIndex) => {
        const newRow = [...row];
        newRow[selectedColIndex] += LefSig_adjusted[rowIndex];
        return newRow;
    });
    return A_Array_corrected;
}

function LefSigCalculater(positivefcsArray,negativefcsArray,fcsColumnNames,PSValueList,selectedPSValue,A_Array) {
    //filter positivefcsArray and negativefcsArray with PSValueList
    const selectedIndices = PSValueList.map(value => fcsColumnNames.indexOf(value)).filter(index => index !== -1);
    console.log('selectedIndices: ',selectedIndices);
    const filterArrayByIndices = (array, indices) => array.map(row => indices.map(index => row[index]));

    const filteredPositivefcsArray = filterArrayByIndices(positivefcsArray, selectedIndices);
    const filteredNegativefcsArray = filterArrayByIndices(negativefcsArray, selectedIndices);
    console.log('filteredPositivefcsArray: ',filteredPositivefcsArray);
    console.log('filteredNegativefcsArray: ',filteredNegativefcsArray);

    //transform positivefcsArray and negativefcsArray into matrix, which is posB and negB
    const posB = transpose(matrix(filteredPositivefcsArray));
    console.log('posB: ',posB);
    const negB = transpose(matrix(filteredNegativefcsArray));
    console.log('negB: ',negB);
    //calculate Median_negB with median operation
    const Median_negB = negB._data.map(row => median(row)); // Median along rows
    console.log('Median_negB: ',Median_negB);
    //calculate difB by subtract posB with Median_negB
    const difB = posB._data.map((row, rowIndex) => row.map(value => value - Median_negB[rowIndex]));
    console.log('difB: ',difB);

    //Set value of difB at row of selectedPSValue to be zero, which is lefB
    const selectedRowIndex = PSValueList.indexOf(selectedPSValue);
    var lefB = matrix(difB);
    medianPosValue = median(lefB._data[selectedRowIndex]);
    lefB._data[selectedRowIndex] = Array(lefB._size[1]).fill(0);
    console.log('lefB: ',lefB);
    //calculate lefR with lefB
    const lefR = multiply(A_Array, lefB);
    console.log('lefR: ',lefR);
    //calculate Median_lefR with median operation
    const Median_lefR = lefR._data.map(row => median(row));
    console.log('Median_lefR: ',Median_lefR);
    //return Median_lefR, which is lefsig
    LefSig = Median_lefR;
    return { LefSig, medianPosValue };
}

document.getElementById('corrected-plot-button').addEventListener('click', () => {
    // plot new scatter plot
    createCorrectedPlotset(fcsArrayPlotset_corrected,x_val_corrected,y_val_corrected,fcsColumnNames);
    document.getElementById('corrected-replot-button').style.display = 'block';
    // plot line chart
    PlotLoneChart(RawSig,LefSig,CorrectFactor,ChannelNames);
    // show save button
    csvArray_Output = replaceArrayColumns(csvArray, A_Array_corrected);
    console.log('csvArray_Output: ',csvArray_Output);
    document.getElementById('save-button').style.display = 'block';
});

function createCorrectedPlotset(fcsArrayPlotset,x_val,y_val,fcsColumnNames) {
    console.log('fcsColumnNames: ',fcsColumnNames);
    const xIndex = fcsColumnNames.indexOf(x_val);
    const yIndex = fcsColumnNames.indexOf(y_val);
    if (xIndex === -1 || yIndex === -1) {
        console.error('Invalid column names');
        return;
    }
    var xData = fcsArrayPlotset.map(row => row[xIndex]);
    var yData = fcsArrayPlotset.map(row => row[yIndex]);
    //scale
    xData = dotMultiply(sign(xData),log10(add(abs(xData),1)))
    yData = dotMultiply(sign(yData),log10(add(abs(yData),1)))
    const trace = {
        x: xData,
        y: yData,
        mode: 'markers',
        type: 'scatter'
    };

    const layout = {
        title: 'Scatter Plot',
        xaxis: { title: x_val + " (log10)"},
        yaxis: { title: y_val + " (log10)"},
        dragmode: 'select' // Enable selection mode
    };
    document.getElementById('corrected-plot-reminder').style.display = 'block';
    document.getElementById('corrected-plot-reminder').innerText = "Total cell counts: " + xData.length
    Plotly.newPlot('corrected-plot', [trace], layout);
    var selected_count = 0
    document.getElementById('corrected-selected-reminder').style.display = 'block';
    // Add event listener for selection
    const plotElement = document.getElementById('corrected-plot');
    plotElement.on('plotly_selected', function(eventData) {
        try{
            const selectedPoints_count = eventData.points.length
            const selectedPoints = eventData.points;
            const selectedIndices = selectedPoints.map(point => point.pointIndex);
            selectedSubset_fcsArray_corrected = selectedIndices.map(index => fcsArrayPlotset[index]);
            console.log('Selected Subset:', selectedSubset_fcsArray_corrected);
            document.getElementById('corrected-selected-reminder').innerText = "Selected cell count: " + selectedPoints_count
        } catch (error) {
            document.getElementById('corrected-selected-reminder').innerText = "Selected cell count: 0";
        }
    });
}


function PlotLoneChart(RawSig,LefSig,CorrectFactor,ChannelNames) {
    const LefSig_adjusted  = multiply(LefSig,CorrectFactor)
    const CorrectedSig = add(RawSig,LefSig_adjusted)
    // Plot the chart using Plotly
    const trace1 = {
        x: ChannelNames,
        y: RawSig,
        mode: 'lines',
        name: 'RawSig',
        line: { color: 'rgba(75, 192, 192, 1)' }
    };

    const trace2 = {
        x: ChannelNames,
        y: CorrectedSig,
        mode: 'lines',
        name: 'CorrectedSig',
        line: { color: 'rgba(153, 102, 255, 1)' }
    };

    const data = [trace1, trace2];

    const layout = {
        title: 'RawSig and CorrectedSig',
        xaxis: { title: 'Channel Names' },
        yaxis: { title: 'Values' }
    };

    Plotly.newPlot('plotly-linechart', data, layout);
}
// Re-plot with selected population
document.getElementById('corrected-replot-button').addEventListener('click', async () => {
    createPlotset(selectedSubset_fcsArray_corrected,x_val_corrected,y_val_corrected,fcsColumnNames);
}); 

function replaceArrayColumns(csvArray, A_Array_corrected) {
    // copy newArray from csvArray
    let twoDimArray = csvArray.map(obj => Object.values(obj));

    const newArray = twoDimArray.map(row => [...row]);

    // transpose A_Array_corrected
    const A_Array_corrected_transposed = transpose(A_Array_corrected);

    // relace value in newArray with A_Array_corrected
    newArray.forEach((row, rowIndex) => {
        for (let colIndex = 2; colIndex < row.length; colIndex++) {
            row[colIndex] = A_Array_corrected_transposed[rowIndex][colIndex - 2];
        }
    });

    return newArray;
}


document.getElementById('save-button').addEventListener('click', () => {
    
    // Convert array to CSV format
    const csvHeader = ['Primary', 'Secondary', ...ChannelNames].join(',');
    const csvContent = csvArray_Output.map(row => row.join(',')).join('\n');
    const csvData = `${csvHeader}\n${csvContent}`;

    // Create a blob from the CSV content
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

    // Create a link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'corrected_unmixing_mtx.csv';

    // Append the link to the body
    document.body.appendChild(link);

    // Programmatically click the link to trigger the download
    link.click();

    // Remove the link from the body
    document.body.removeChild(link);
});
