document.addEventListener('DOMContentLoaded', () => {
  const categories = {
    length: {
      label: 'Length',
      units: {
        'Kilometers': 1000, 'Meters': 1, 'Centimeters': 0.01, 'Millimeters': 0.001,
        'Miles': 1609.344, 'Yards': 0.9144, 'Feet': 0.3048, 'Inches': 0.0254
      }
    },
    weight: {
      label: 'Weight',
      units: {
        'Kilograms': 1, 'Grams': 0.001, 'Milligrams': 0.000001,
        'Pounds': 0.453592, 'Ounces': 0.0283495, 'Tonnes': 1000
      }
    },
    temperature: {
      label: 'Temperature',
      units: { 'Celsius': 'C', 'Fahrenheit': 'F', 'Kelvin': 'K' },
      custom: true
    },
    speed: {
      label: 'Speed',
      units: {
        'km/h': 1, 'm/s': 3.6, 'mph': 1.60934, 'knots': 1.852
      }
    },
    data: {
      label: 'Data',
      units: {
        'Bytes': 1, 'Kilobytes': 1024, 'Megabytes': 1048576,
        'Gigabytes': 1073741824, 'Terabytes': 1099511627776
      }
    }
  };

  const categorySelect = document.getElementById('unit-category');
  const fromSelect = document.getElementById('unit-from');
  const toSelect = document.getElementById('unit-to');
  const fromInput = document.getElementById('val-from');
  const toInput = document.getElementById('val-to');

  function populateUnits() {
    const cat = categories[categorySelect.value];
    const unitNames = Object.keys(cat.units);
    fromSelect.innerHTML = unitNames.map(u => `<option value="${u}">${u}</option>`).join('');
    toSelect.innerHTML = unitNames.map(u => `<option value="${u}">${u}</option>`).join('');
    if (unitNames.length > 1) toSelect.selectedIndex = 1;
    convert();
  }

  function convertTemp(val, from, to) {
    // Convert to Celsius first
    let c;
    if (from === 'C') c = val;
    else if (from === 'F') c = (val - 32) * 5 / 9;
    else c = val - 273.15;
    // Convert from Celsius
    if (to === 'C') return c;
    if (to === 'F') return c * 9 / 5 + 32;
    return c + 273.15;
  }

  function convert() {
    const cat = categories[categorySelect.value];
    const val = parseFloat(fromInput.value);
    if (isNaN(val)) { toInput.value = ''; return; }

    if (cat.custom) {
      const fromUnit = cat.units[fromSelect.value];
      const toUnit = cat.units[toSelect.value];
      toInput.value = convertTemp(val, fromUnit, toUnit).toFixed(4).replace(/\.?0+$/, '');
    } else {
      const fromFactor = cat.units[fromSelect.value];
      const toFactor = cat.units[toSelect.value];
      const result = (val * fromFactor) / toFactor;
      toInput.value = result.toPrecision(10).replace(/\.?0+$/, '');
    }
  }

  categorySelect.addEventListener('change', populateUnits);
  fromSelect.addEventListener('change', convert);
  toSelect.addEventListener('change', convert);
  fromInput.addEventListener('input', convert);

  document.getElementById('swap-btn').addEventListener('click', () => {
    const tempIdx = fromSelect.selectedIndex;
    fromSelect.selectedIndex = toSelect.selectedIndex;
    toSelect.selectedIndex = tempIdx;
    convert();
  });

  document.getElementById('copy-btn').addEventListener('click', () => {
    copyToClipboard(toInput.value);
  });

  populateUnits();
  renderRelatedTools('unit-converter');
});
