// global variables
var xy = [];
var spread = [];
var reverb = [];
var mode = [];
var updatingFromOSC = false; // Flag to prevent feedback loop

var digicoRXPort = 90001; // Default port for DiGiCo RX
var digicoIP = "127.0.0.1"; // Default IP for DiGiCo

function init() {
  script.log("Custom module init");

  // Create a container to hold X and Y values for each of the 128 objects
  SOXYContainer = local.values.addContainer("XY", "X and Y values for each of the 128 objects");
  for (var i = 1; i <= 16; i++) {
		xy[i]= SOXYContainer.addPoint2DParameter(i, "XY");
		// xy[i].setAttribute("readonly", true);
    	};
  SOXYContainer.setCollapsed(true);

  // Create a container to hold Spread values for each of the 128 objects
  SOSpreadContainer = local.values.addContainer("Spread", "Spread values for each of the 128 objects");
  for (var i = 1; i <= 16; i++) {
    spread[i] = SOSpreadContainer.addFloatParameter(i, "Spread", 0, 0, 1);
    SOSpreadContainer.setCollapsed(true);
  }

  // Create a container to hold Reverb values for each of the 128 objects
  SOReverbContainer = local.values.addContainer("Reverb", "Reverb send levels for each of the 128 objects");
  for (var i = 1; i <= 16; i++) {
    reverb[i] = SOReverbContainer.addFloatParameter(i, "Reverb", 0, -120, 24);
    SOReverbContainer.setCollapsed(true);
  }

  SODelayModeContainer = local.values.addContainer("Delay Mode", "0-1-2");
  for (var i = 1; i <= 16; i++) {
    mode[i] = SODelayModeContainer.addIntParameter(i, "Mode", 0, 0, 2);
    SODelayModeContainer.setCollapsed(true);
  }

}


function moduleParameterChanged(param) {
  script.log(param.name + " parameter changed, new value: " + param.get());

  if(param.is(local.parameters.en_BridgeRxPort)){
    script.log("Updating En-Bridge RX port to: " + param.get());
    en_BridgeRxPort = param.get();
  }

   else if (param.is(local.parameters.en_BridgeIP)){ 
    var ip = param.get();
    // Optional: validate IP format
    en_BridgeIP = ip;
    script.log("Updating En-Bridge IP to: " + en_BridgeIP);
  }
}

function moduleValueChanged(value) {
  // Don't send OSC if we're updating from incoming OSC (prevent feedback loop)
  if (updatingFromOSC) return;
  
  // Check which container the value belongs to and send appropriate OSC
  // Check if it's a reverb parameter
  for (var i = 1; i <= 16; i++) {
    if (value == reverb[i]) {
      script.log("Reverb " + i + " changed to: " + value.get());
      local.send("/dbaudio1/matrixinput/reverbsendgain/" + i, value.get());
      return;
    }
  }
  
  // Check if it's a spread parameter
  for (var i = 1; i <= 16; i++) {
    if (value == spread[i]) {
      script.log("Spread " + i + " changed to: " + value.get());
      local.send("/dbaudio1/positioning/source_spread/" + i, value.get());
      return;
    }
  }
  
  // Check if it's a delay mode parameter
  for (var i = 1; i <= 16; i++) {
    if (value == mode[i]) {
      script.log("Mode " + i + " changed to: " + value.get());
      local.send("/dbaudio1/positioning/source_delaymode/" + i, value.get());
      return;
    }
  }
  
  // Check if it's an XY position parameter
  for (var i = 1; i <= 16; i++) {
    if (value == xy[i]) {
      var pos = value.get();
      script.log("XY " + i + " changed to: [" + pos[0] + ", " + pos[1] + "]");
      local.send("/dbaudio1/coordinatemapping/source_position_xy/1/" + i, pos[0], pos[1]);
      return;
    }
  }
}

// This is the callback function for the "Custom command" command
function customCmd(val) {
  script.log("Custom command called with value " + val);
  local.parameters.moduleParam.set(val);
}



   function oscEvent(address, args) {
    updatingFromOSC = true; // Set flag to prevent feedback
    
    if (local.match(address, "/dbaudio1/matrixinput/reverbsendgain/*")) {
      var parts = address.split("/");
      var index = parseInt(parts[parts.length - 1]);
      script.log("Reverb for object "+index+": "+args[0]);
      reverb[index].set(args[0]);
    }

    else if (local.match(address, "/dbaudio1/positioning/source_spread/*")) {
      var parts = address.split("/");
      var index = parseInt(parts[parts.length - 1]);
      local.sendTo(digicoIP, digicoRXPort, "/dbaudio1/positioning/source_spread/" + index, args[0]);
      script.log("Spread for object "+index+": "+args[0]);
      spread[index].set(args[0]);
    }

    else if (local.match(address, "/dbaudio1/positioning/source_delaymode/*")) {
      var parts = address.split("/");
      var index = parseInt(parts[parts.length - 1]);
      local.sendTo(digicoIP, digicoRXPort, "/dbaudio1/positioning/source_delaymode/" + index, args[0]);
      script.log("Delay mode for "+index+": "+args[0]);
      mode[index].set(args[0]);
    }

    else if( local.match(address, "/dbaudio1/coordinatemapping/source_position_x/1/*")) {
      var parts = address.split("/");
      var index = parseInt(parts[parts.length - 1]);
      local.sendTo(digicoIP, digicoRXPort, "/dbaudio1/coordinatemapping/source_position_x/1/" + index, args[0]);
      script.log("X position for object "+index+": "+args[0]);
      var currentY = xy[index].get()[1]; // Get current Y value
      xy[index].set(args[0], currentY);
    }

    else if( local.match(address, "/dbaudio1/coordinatemapping/source_position_y/1/*")) {
      var parts = address.split("/");
      var index = parseInt(parts[parts.length - 1]);
      local.sendTo(digicoIP, digicoRXPort, "/dbaudio1/coordinatemapping/source_position_y/1/" + index, args[0]);
      script.log("Y position for object "+index+": "+args[0]);
      var currentX = xy[index].get()[0]; // Get current X value
      xy[index].set(currentX, args[0]);
    }

    else if (local.match(address, "/dbaudio1/coordinatemapping/source_position_xy/1/*")) {
      var parts = address.split("/");
      var index = parseInt(parts[parts.length - 1]);
      local.sendTo(digicoIP, digicoRXPort, "/dbaudio1/coordinatemapping/source_position_xy/1/" + index, args[0], args[1]);
      script.log("X position for object "+index+": "+args[0] + ", Y position: " + args[1]);
      xy[index].set(args[0], args[1]);
    }

    else 
      {
      script.logWarning("OSC Event parser received useless OSC messages: " + address + " " + args);
      }
    
    updatingFromOSC = false; // Clear flag after all updates
}
/**
 * Set the EnSpace reverb level send for a specific object
 * @param {integer} object 
 * @param {float} gain (from -120 to +24 in dB)
 */
function reverbSendGain(object, gain)
{
  script.log("Setting reverb send gain for object " + object + " to " + gain + " dB");
	local.send("/dbaudio1/matrixinput/reverbsendgain/" + object, gain);
}