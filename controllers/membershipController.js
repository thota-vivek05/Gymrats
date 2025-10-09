const User = require('../model/User');
const Trainer = require('../model/Trainer');

// Extend user membership
const extendMembership = async (req, res) => {
    try {
        const { additionalMonths, paymentMethod } = req.body;
        const userId = req.session.user.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.extendMembership(additionalMonths);
        
        res.json({ 
            message: `Membership extended by ${additionalMonths} months successfully`,
            months_remaining: user.membershipDuration.months_remaining,
            end_date: user.membershipDuration.end_date
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