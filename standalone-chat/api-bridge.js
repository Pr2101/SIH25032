<script>
window.api = {
  sendText: async (text) => {
    // TODO: plug a real model later; this is a stub
    await new Promise(r => setTimeout(r, 300));
    return `AI: ${text}\n\n(This is a demo reply. Add a real LLM later.)`;
  },
  sendImage: async () => {
    await new Promise(r => setTimeout(r, 300));
    return 'AI: I received your image and processed it. (demo)';
  },
  generateHolidayPlan: async (destination, days) => {
    await new Promise(r => setTimeout(r, 300));
    return `Day 1: Explore ${destination} city center\n• Morning: Landmarks\n• Afternoon: Museum\n• Evening: Local food\n\nDay 2: Nature & culture\n• Morning: Park\n• Afternoon: Cultural site\n• Evening: Night market\n\nDay ${days}: Wrap-up & souvenirs`;
  }
};
</script>