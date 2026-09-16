/**
 * GANESH HERITAGE - MEMBER DIRECTORY & MANAGEMENT LOGIC
 */

const STORAGE_KEY = 'ganesh_heritage_members_v1';

// Get current dataset from localStorage or fallback to INITIAL_MEMBERS
function getMembersData() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading from localStorage', e);
  }
  // Initialize with initial members from data.js
  if (typeof INITIAL_MEMBERS !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MEMBERS));
    return INITIAL_MEMBERS;
  }
  return [];
}

// Save entire dataset to localStorage
function saveAllMembers(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving data to localStorage', e);
    return false;
  }
}

// Find a single member by block and flat number
function findMember(block, flatNo) {
  const members = getMembersData();
  const id = `${block}-${flatNo}`.toUpperCase();
  return members.find(m => m.id.toUpperCase() === id || (m.block.toUpperCase() === block.toUpperCase() && String(m.flatNo) === String(flatNo)));
}

// Update or add a member
function upsertMember(memberData) {
  const members = getMembersData();
  const block = memberData.block.toUpperCase();
  const flatNo = String(memberData.flatNo).trim();
  const id = `${block}-${flatNo}`;
  const floor = parseInt(flatNo.length > 2 ? flatNo.slice(0, -2) : flatNo[0], 10) || 1;
  
  const existingIdx = members.findIndex(m => m.id === id);
  const isOccupied = Boolean((memberData.name && memberData.name.trim()) || (memberData.phone && memberData.phone.trim()));
  
  const record = {
    id: id,
    block: block,
    flatNo: flatNo,
    floor: floor,
    name: (memberData.name || '').trim(),
    phone: (memberData.phone || '').trim().replace(/\D/g, '').slice(-10),
    status: isOccupied ? 'Occupied' : 'Vacant',
    residentType: memberData.residentType || (isOccupied ? 'Owner' : ''),
    additionalDetails: (memberData.additionalDetails || '').trim(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    members[existingIdx] = { ...members[existingIdx], ...record };
  } else {
    members.push(record);
  }

  saveAllMembers(members);
  return record;
}

// Reset dataset to initial PDF data
function resetToPDFData() {
  if (typeof INITIAL_MEMBERS !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MEMBERS));
    return true;
  }
  return false;
}

// Show temporary toast notification
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
  toast.innerHTML = `<span>✓</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Copy text to clipboard helper
function copyToClipboard(text, label = 'Phone number') {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} copied to clipboard!`);
    }).catch(() => fallbackCopy(text, label));
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(`${label} copied!`);
  } catch (err) {
    alert(`Copy: ${text}`);
  }
  document.body.removeChild(textArea);
}

// Export directory to CSV file
function exportDirectoryCSV() {
  const members = getMembersData();
  const headers = ['Block', 'Flat No', 'Floor', 'Resident Name', 'Mobile Number', 'Status', 'Resident Type', 'Additional Details'];
  
  const rows = members.map(m => [
    `"${m.block}"`,
    `"${m.flatNo}"`,
    `"${m.floor}"`,
    `"${(m.name || '').replace(/"/g, '""')}"`,
    `"${m.phone || ''}"`,
    `"${m.status}"`,
    `"${m.residentType || ''}"`,
    `"${(m.additionalDetails || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Ganesh_Heritage_Members_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Member directory downloaded as CSV');
}

// Export backup JSON
function exportDirectoryJSON() {
  const members = getMembersData();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(members, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `Ganesh_Heritage_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('JSON backup downloaded');
}

// Get initials for avatar
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getMembersData,
    saveAllMembers,
    findMember,
    upsertMember,
    resetToPDFData,
    getInitials
  };
}
