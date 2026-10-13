import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase.js';
import { collections, createProduct, updateProduct, createCustomer, getSetting, setSetting } from '../db/collections.js';
import { ROLES } from '../auth/index.js';
import { formatCurrency } from '../lib/utils.js';
import { showToast } from '../components/Toast.jsx';
import { sendInviteEmail } from '../lib/emailjs.js';

export default function Settings({ user, onSignOut }) {
  const [activeTab, setActiveTab] = useState('general');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Product form state
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [productSaleUnit, setProductSaleUnit] = useState('');
  const [productConversionFactor, setProductConversionFactor] = useState('');
  const [productSellPrice, setProductSellPrice] = useState('');
  const [productCostPrice, setProductCostPrice] = useState('');
  const [productReorderLevel, setProductReorderLevel] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // User form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState(ROLES.ATTENDANT);
  const [invitingUser, setInvitingUser] = useState(false);

  // Icon upload state
  const [appIconUrl, setAppIconUrl] = useState('');
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Business details state
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [savingBusiness, setSavingBusiness] = useState(false);

  // Email settings state
  const [emailFrom, setEmailFrom] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);

    try {
      // Load products
      const productsSnapshot = await getDocs(collections.products);
      const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);

      // Load users (only for owner)
      if (user.role === ROLES.OWNER) {
        const usersSnapshot = await getDocs(collections.users);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      }

      // Load app icon
      const iconUrl = await getSetting('appIcon');
      setAppIconUrl(iconUrl || '/favicon.svg');
      updateFavicon(iconUrl || '/favicon.svg');

      // Load business details
      const businessDetails = await getSetting('businessDetails');
      if (businessDetails) {
        setBusinessName(businessDetails.name || '');
        setBusinessAddress(businessDetails.address || '');
        setBusinessPhone(businessDetails.phone || '');
        setBusinessEmail(businessDetails.email || '');
        setTaxId(businessDetails.taxId || '');
      }

      // Load email settings
      const emailSettings = await getSetting('emailSettings');
      if (emailSettings) {
        setEmailFrom(emailSettings.from || '');
        setEmailPassword(emailSettings.password || '');
        setSmtpHost(emailSettings.smtpHost || '');
        setSmtpPort(emailSettings.smtpPort || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFavicon = (url) => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = url;
    }
  };

  const handleAddProduct = async () => {
    if (!productName || !productCategory || !productUnit || !productSellPrice) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (savingProduct) {
      return; // Prevent double submission
    }

    setSavingProduct(true);

    try {
      await createProduct({
        name: productName,
        category: productCategory,
        unit: productUnit,
        saleUnit: productSaleUnit || productUnit,
        conversionFactor: productConversionFactor ? parseFloat(productConversionFactor) : 1,
        sellPrice: parseInt(productSellPrice),
        costPrice: productCostPrice ? parseInt(productCostPrice) : undefined,
        reorderLevel: productReorderLevel ? parseInt(productReorderLevel) : 10,
        perishable: true,
        shelfLifeDays: 7,
      });

      showToast('Product added successfully', 'success');
      setProductName('');
      setProductCategory('');
      setProductUnit('');
      setProductSaleUnit('');
      setProductConversionFactor('');
      setProductSellPrice('');
      setProductCostPrice('');
      setProductReorderLevel('');
      loadSettingsData();
    } catch (error) {
      console.error('Error adding product:', error);
      showToast('Error adding product: ' + error.message, 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    if (savingProduct) {
      return; // Prevent double submission
    }

    setSavingProduct(true);

    try {
      await updateProduct(editingProduct.id, {
        name: productName,
        category: productCategory,
        unit: productUnit,
        saleUnit: productSaleUnit || productUnit,
        conversionFactor: productConversionFactor ? parseFloat(productConversionFactor) : 1,
        sellPrice: parseInt(productSellPrice),
        costPrice: productCostPrice ? parseInt(productCostPrice) : undefined,
        reorderLevel: productReorderLevel ? parseInt(productReorderLevel) : 10,
      });

      showToast('Product updated successfully', 'success');
      setEditingProduct(null);
      setProductName('');
      setProductCategory('');
      setProductUnit('');
      setProductSaleUnit('');
      setProductConversionFactor('');
      setProductSellPrice('');
      setProductCostPrice('');
      setProductReorderLevel('');
      loadSettingsData();
    } catch (error) {
      console.error('Error updating product:', error);
      showToast('Error updating product: ' + error.message, 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductCategory(product.category);
    setProductUnit(product.unit);
    setProductSaleUnit(product.saleUnit || product.unit);
    setProductConversionFactor(product.conversionFactor?.toString() || '');
    setProductSellPrice(product.sellPrice.toString());
    setProductCostPrice('');
    setProductReorderLevel(product.reorderLevel?.toString() || '');
  };

  const handleInviteUser = async () => {
    if (!newUserEmail || !newUserRole) {
      showToast('Please enter email and select role', 'error');
      return;
    }

    if (invitingUser) {
      return; // Prevent double submission
    }

    setInvitingUser(true);

    try {
      // Add user to Firestore
      await setDoc(doc(collections.users, newUserEmail), {
        email: newUserEmail,
        name: newUserEmail.split('@')[0],
        role: newUserRole,
        active: true,
        invitedBy: user.email,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      });

      // Send invitation email
      try {
        const appName = await getSetting('businessDetails').then(details => details?.name) || 'Shamba Books';
        await sendInviteEmail(
          newUserEmail,
          user.displayName || user.email.split('@')[0],
          user.email,
          newUserRole,
          appName
        );
        showToast('User invited and email sent successfully', 'success');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Still show success for user creation, but warn about email
        showToast('User invited, but email failed to send. Check EmailJS configuration.', 'warning');
      }

      setNewUserEmail('');
      setNewUserRole(ROLES.ATTENDANT);
      loadSettingsData();
    } catch (error) {
      console.error('Error inviting user:', error);
      showToast('Error inviting user: ' + error.message, 'error');
    } finally {
      setInvitingUser(false);
    }
  };

  const handleToggleUserActive = async (userEmail, currentActive) => {
    try {
      await updateDoc(doc(collections.users, userEmail), {
        active: !currentActive,
      });
      showToast('User updated successfully', 'success');
      loadSettingsData();
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Error updating user: ' + error.message, 'error');
    }
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(png|jpeg|jpg|svg\+xml)/)) {
      showToast('Please upload a PNG, JPG, or SVG image', 'error');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }

    setUploadingIcon(true);

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `app-icons/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Save to settings
      await setSetting('appIcon', downloadUrl);
      setAppIconUrl(downloadUrl);
      updateFavicon(downloadUrl);

      showToast('Icon updated successfully', 'success');
    } catch (error) {
      console.error('Error uploading icon:', error);
      if (error.code === 'storage/unauthorized' || error.message.includes('CORS')) {
        showToast('CORS error: Firebase Storage needs configuration. See console for details.', 'error');
        console.error(
          'CORS Configuration Required:\n' +
          'To fix this, you need to configure CORS for your Firebase Storage bucket:\n' +
          '1. Install gsutil: https://cloud.google.com/storage/docs/gsutil_install\n' +
          '2. Run: gsutil cors set cors.json gs://wanyomo-eaab7.firebasestorage.app\n' +
          '3. Create cors.json file with:\n' +
          '[\n' +
          '  {\n' +
          '    "origin": ["*"],\n' +
          '    "method": ["GET", "POST"],\n' +
          '    "maxAgeSeconds": 3600\n' +
          '  }\n' +
          ']'
        );
      } else {
        showToast('Error uploading icon: ' + error.message, 'error');
      }
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSaveBusinessDetails = async () => {
    if (savingBusiness) return;

    setSavingBusiness(true);

    try {
      await setSetting('businessDetails', {
        name: businessName,
        address: businessAddress,
        phone: businessPhone,
        email: businessEmail,
        taxId: taxId,
      });

      showToast('Business details saved successfully', 'success');
    } catch (error) {
      console.error('Error saving business details:', error);
      showToast('Error saving business details: ' + error.message, 'error');
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (savingEmail) return;

    if (!emailFrom || !emailPassword || !smtpHost || !smtpPort) {
      showToast('Please fill in all email settings fields', 'error');
      return;
    }

    setSavingEmail(true);

    try {
      await setSetting('emailSettings', {
        from: emailFrom,
        password: emailPassword,
        smtpHost: smtpHost,
        smtpPort: smtpPort,
      });

      showToast('Email settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving email settings:', error);
      showToast('Error saving email settings: ' + error.message, 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center" style="min-height: 200px;">
        <div class="spinner"></div>
      </div>
    );
  }

  return (
    <div class="settings">
      <h2>Settings</h2>

      {/* Tabs */}
      <div class="flex gap-sm mb-lg" style="overflow-x: auto;">
        <button
          class={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>

        <button
          class={`btn ${activeTab === 'business' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('business')}
        >
          Business
        </button>

        <button
          class={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('email')}
        >
          Email
        </button>
        
        {user.role === ROLES.OWNER && (
          <>
            <button
              class={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('products')}
            >
              Products
            </button>
            <button
              class={`btn ${activeTab === 'team' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('team')}
            >
              Team
            </button>
          </>
        )}
        
        <button
          class={`btn ${activeTab === 'account' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div class="card">
          <h3>General Settings</h3>
          <p class="text-gray">App settings and preferences</p>
          <div class="divider"></div>

          {/* App Icon Upload */}
          <div class="mb-lg">
            <label>App Icon</label>
            <div class="flex items-center gap-md mb-md">
              <img
                src={appIconUrl}
                alt="App Icon"
                style="width: 64px; height: 64px; object-fit: contain; border-radius: 8px; border: 1px solid var(--color-gray-300);"
              />
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onInput={handleIconUpload}
                  disabled={uploadingIcon}
                  style="display: none;"
                  id="icon-upload"
                />
                <label
                  for="icon-upload"
                  class={`btn btn-outline ${uploadingIcon ? 'disabled' : ''}`}
                  style="cursor: pointer;"
                >
                  {uploadingIcon ? 'Uploading...' : 'Upload New Icon'}
                </label>
                <p class="text-sm text-gray mt-sm">
                  PNG, JPG, or SVG (max 2MB)
                </p>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="flex justify-between items-center">
            <span>Allow Negative Stock</span>
            <span class="text-gray">Configure in future</span>
          </div>
        </div>
      )}

      {/* Business Details Settings */}
      {activeTab === 'business' && (
        <div class="card">
          <h3>Business Details</h3>
          <p class="text-gray">Configure your business information for invoices</p>
          <div class="divider"></div>

          <div class="mb-md">
            <label>Business Name</label>
            <input
              type="text"
              value={businessName}
              onInput={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., Wanyomo Enterprises"
            />
          </div>

          <div class="mb-md">
            <label>Business Address</label>
            <input
              type="text"
              value={businessAddress}
              onInput={(e) => setBusinessAddress(e.target.value)}
              placeholder="e.g., 123 Main Street, Nairobi"
            />
          </div>

          <div class="mb-md">
            <label>Business Phone</label>
            <input
              type="text"
              value={businessPhone}
              onInput={(e) => setBusinessPhone(e.target.value)}
              placeholder="e.g., +254 700 000 000"
            />
          </div>

          <div class="mb-md">
            <label>Business Email</label>
            <input
              type="email"
              value={businessEmail}
              onInput={(e) => setBusinessEmail(e.target.value)}
              placeholder="e.g., info@wanyomo.com"
            />
          </div>

          <div class="mb-md">
            <label>Tax ID / KRA PIN (Optional)</label>
            <input
              type="text"
              value={taxId}
              onInput={(e) => setTaxId(e.target.value)}
              placeholder="e.g., A00 000000 000L"
            />
          </div>

          <button class="btn btn-primary btn-block" onClick={handleSaveBusinessDetails} disabled={savingBusiness}>
            {savingBusiness ? 'Saving...' : 'Save Business Details'}
          </button>
        </div>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <div class="card">
          <h3>Email Settings</h3>
          <p class="text-gray">Configure email settings for sending invoices</p>
          <div class="divider"></div>

          <div class="mb-md">
            <label>From Email Address</label>
            <input
              type="email"
              value={emailFrom}
              onInput={(e) => setEmailFrom(e.target.value)}
              placeholder="e.g., noreply@wanyomo.com"
            />
          </div>

          <div class="mb-md">
            <label>Email Password / App Password</label>
            <input
              type="password"
              value={emailPassword}
              onInput={(e) => setEmailPassword(e.target.value)}
              placeholder="Enter your email password or app password"
            />
            <p class="text-sm text-gray mt-sm">
              For Gmail, use an App Password from Google Account settings
            </p>
          </div>

          <div class="mb-md">
            <label>SMTP Host</label>
            <input
              type="text"
              value={smtpHost}
              onInput={(e) => setSmtpHost(e.target.value)}
              placeholder="e.g., smtp.gmail.com"
            />
          </div>

          <div class="mb-md">
            <label>SMTP Port</label>
            <input
              type="text"
              value={smtpPort}
              onInput={(e) => setSmtpPort(e.target.value)}
              placeholder="e.g., 587"
            />
          </div>

          <button class="btn btn-primary btn-block" onClick={handleSaveEmailSettings} disabled={savingEmail}>
            {savingEmail ? 'Saving...' : 'Save Email Settings'}
          </button>
        </div>
      )}

      {/* Products Management */}
      {activeTab === 'products' && user.role === ROLES.OWNER && (
        <div>
          <div class="card mb-lg">
            <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            
            <div class="mb-md">
              <label>Product Name</label>
              <input
                type="text"
                value={productName}
                onInput={(e) => setProductName(e.target.value)}
                placeholder="e.g., Milk"
              />
            </div>

            <div class="mb-md">
              <label>Category</label>
              <input
                type="text"
                value={productCategory}
                onInput={(e) => setProductCategory(e.target.value)}
                placeholder="e.g., dairy"
              />
            </div>

            <div class="mb-md">
              <label>Stock Unit</label>
              <input
                type="text"
                value={productUnit}
                onInput={(e) => setProductUnit(e.target.value)}
                placeholder="e.g., tray"
              />
            </div>

            <div class="mb-md">
              <label>Sale Unit (optional)</label>
              <input
                type="text"
                value={productSaleUnit}
                onInput={(e) => setProductSaleUnit(e.target.value)}
                placeholder="e.g., egg (leave blank to use stock unit)"
              />
            </div>

            <div class="mb-md">
              <label>Conversion Factor (sale units per stock unit)</label>
              <input
                type="number"
                value={productConversionFactor}
                onInput={(e) => setProductConversionFactor(e.target.value)}
                placeholder="e.g., 30 (1 tray = 30 eggs)"
                step="0.01"
                min="0.01"
              />
              <p class="text-sm text-gray mt-sm">
                {productConversionFactor && productSaleUnit 
                  ? `1 ${productUnit} = ${productConversionFactor} ${productSaleUnit}`
                  : 'Leave blank if selling in the same unit as stock'}
              </p>
            </div>

            <div class="mb-md">
              <label>Sell Price (KES)</label>
              <input
                type="number"
                value={productSellPrice}
                onInput={(e) => setProductSellPrice(e.target.value)}
                placeholder="e.g., 60"
              />
            </div>

            <div class="mb-md">
              <label>Cost Price (KES) - Hidden from Attendants</label>
              <input
                type="number"
                value={productCostPrice}
                onInput={(e) => setProductCostPrice(e.target.value)}
                placeholder="e.g., 40"
              />
            </div>

            <div class="mb-md">
              <label>Reorder Level</label>
              <input
                type="number"
                value={productReorderLevel}
                onInput={(e) => setProductReorderLevel(e.target.value)}
                placeholder="e.g., 20"
              />
            </div>

            {editingProduct ? (
              <div class="flex gap-sm">
                <button class="btn btn-primary" onClick={handleUpdateProduct} disabled={savingProduct}>
                  {savingProduct ? 'Updating...' : 'Update Product'}
                </button>
                <button
                  class="btn btn-ghost"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductName('');
                    setProductCategory('');
                    setProductUnit('');
                    setProductSaleUnit('');
                    setProductConversionFactor('');
                    setProductSellPrice('');
                    setProductCostPrice('');
                    setProductReorderLevel('');
                  }}
                  disabled={savingProduct}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button class="btn btn-primary btn-block" onClick={handleAddProduct} disabled={savingProduct}>
                {savingProduct ? 'Adding...' : 'Add Product'}
              </button>
            )}
          </div>

          {/* Products List */}
          <div class="card">
            <h3>Products</h3>
            <div class="grid grid-1">
              {products.map(product => (
                <div
                  key={product.id}
                  class="flex justify-between items-center"
                  style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-gray-200);"
                >
                  <div>
                    <div class="font-bold">{product.name}</div>
                    <div class="text-sm text-gray">
                      {formatCurrency(product.sellPrice)} / {product.saleUnit || product.unit}
                      {product.saleUnit && product.saleUnit !== product.unit && (
                        <span class="text-xs text-gray ml-sm">
                          (1 {product.unit} = {product.conversionFactor || 1} {product.saleUnit})
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    class="btn btn-sm btn-outline"
                    onClick={() => handleEditProduct(product)}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team Management */}
      {activeTab === 'team' && user.role === ROLES.OWNER && (
        <div>
          <div class="card mb-lg">
            <h3>Invite Team Member</h3>
            {!import.meta.env.VITE_EMAILJS_SERVICE_ID && (
              <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
                <p style="margin: 0; color: #856404;">
                  <strong>Email not configured:</strong> Invitations will work, but no email will be sent.
                  <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">
                    Set up EmailJS
                  </a> to enable email invitations.
                </p>
              </div>
            )}
            
            <div class="mb-md">
              <label>Email Address</label>
              <input
                type="email"
                value={newUserEmail}
                onInput={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div class="mb-md">
              <label>Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value={ROLES.ATTENDANT}>Attendant</option>
                <option value={ROLES.MANAGER}>Manager</option>
                <option value={ROLES.OWNER}>Owner</option>
              </select>
            </div>

            <button class="btn btn-primary btn-block" onClick={handleInviteUser} disabled={invitingUser}>
              {invitingUser ? 'Sending...' : 'Send Invite'}
            </button>
          </div>

          {/* Team List */}
          <div class="card">
            <h3>Team Members</h3>
            <div class="grid grid-1">
              {users.map(u => (
                <div
                  key={u.id}
                  class="flex justify-between items-center"
                  style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-gray-200);"
                >
                  <div>
                    <div class="font-bold">{u.name}</div>
                    <div class="text-sm text-gray">{u.email}</div>
                    <span class={`badge ${u.active ? 'badge-green' : 'badge-gray'}`}>
                      {u.role} - {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {u.role !== ROLES.OWNER && (
                    <button
                      class={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => handleToggleUserActive(u.email, u.active)}
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Settings */}
      {activeTab === 'account' && (
        <div class="card">
          <h3>Account</h3>
          <div class="mb-md">
            <div class="font-bold">{user.displayName}</div>
            <div class="text-gray">{user.email}</div>
            <span class="badge badge-green">{user.role}</span>
          </div>
          <div class="divider"></div>
          <button class="btn btn-danger btn-block" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
