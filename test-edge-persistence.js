// Test script to verify edge persistence with handle information
// Run this in the browser console while on a canvas page

// Test 1: Create edges with specific handles
console.log('Testing edge persistence...');

// Get the current edges from React Flow
const edges = window.useCanvasStore?.getState?.().edges;
if (edges) {
  console.log('Current edges:', edges.length);
  edges.forEach(edge => {
    console.log(`Edge ${edge.id}:`, {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: edge.data,
      type: edge.type
    });
  });
} else {
  console.log('No edges found or store not accessible');
}

// Instructions for manual testing:
console.log('\n=== Manual Test Instructions ===');
console.log('1. Create nodes with multiple handles (e.g., IfElse node)');
console.log('2. Connect edges to specific handles (not just default positions)');
console.log('3. Customize edge settings (color, flow direction, speed)');
console.log('4. Save the canvas (wait for auto-save or click Save)');
console.log('5. Refresh the page');
console.log('6. Check if edges maintain their handle positions and custom settings');
console.log('7. Delete an edge and verify it stays deleted after refresh');