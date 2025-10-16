const User = require('../model/User');
const Trainer = require('../model/Trainer');

// Extend user membership
// Extend user membership
const extendMembership = async (req, res) => {
    try {
        // console.log('=== MEMBERSHIP EXTENSION DEBUG ===');
        const { additionalMonths, cardType, cardNumber, expiryDate, cvv, cardholderName, autoRenew } = req.body;
        const userId = req.session.user.id;
        
        // console.log('1. User ID:', userId);
        // console.log('2. Additional months:', additionalMonths);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('3. Before extension - months_remaining:', user.membershipDuration.months_remaining);
        console.log('4. Before extension - status:', user.status);

        await user.extendMembership(parseInt(additionalMonths));
        user.membershipDuration.auto_renew = autoRenew;
        await user.save();

        // Refresh user data from database
        const updatedUser = await User.findById(userId);
        console.log('5. After extension - months_remaining:', updatedUser.membershipDuration.months_remaining);
        console.log('6. After extension - status:', updatedUser.status);

        // Update session
        req.session.user = {
            ...req.session.user,
            ...updatedUser.toObject(),
            membershipDuration: updatedUser.membershipDuration
        };

        console.log('7. Session updated - months_remaining:', req.session.user.membershipDuration.months_remaining);

        // ✅ RETURN JSON RESPONSE (instead of redirect)
        res.json({ 
            success: true,
            message: `Membership extended by ${additionalMonths} months successfully!`,
            months_remaining: updatedUser.membershipDuration.months_remaining,
            end_date: updatedUser.membershipDuration.end_date
        });

    } catch (error) {
        console.error('Error extending membership:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Toggle auto-renew
const toggleAutoRenew = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.membershipDuration.auto_renew = !user.membershipDuration.auto_renew;
        await user.save();

        res.json({ 
            message: `Auto-renew ${user.membershipDuration.auto_renew ? 'enabled' : 'disabled'}`,
            auto_renew: user.membershipDuration.auto_renew
        });
    } catch (error) {
        console.error('Error toggling auto-renew:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get membership status
const getMembershipStatus = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            membershipType: user.membershipType,
            months_remaining: user.membershipDuration.months_remaining,
            end_date: user.membershipDuration.end_date,
            status: user.status,
            isActive: user.isMembershipActive()
        });
    } catch (error) {
        console.error('Error getting membership status:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    extendMembership,
    getMembershipStatus,
    toggleAutoRenew
};